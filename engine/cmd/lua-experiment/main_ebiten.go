package main

import (
	"bytes"
	"fmt"
	"image/color"
	_ "image/png" // Necessario per caricare immagini PNG, anche se non lo usiamo direttamente
	"log"
	"sync"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/examples/resources/fonts"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
	"github.com/hajimehoshi/ebiten/v2/text/v2"
	lua "github.com/yuin/gopher-lua"
)

// --- Costanti e Variabili Globali ---

const (
	screenWidth          = 800
	screenHeight         = 600
	luaTickDuration      = 16 * time.Millisecond // Durata di un tick per Lua
	messageLifetimeTicks = 180                   // Durata di un messaggio sullo schermo (3 secondi a 60 FPS)
)

// Variabili globali per la gestione dei tick di Lua, condivise tra tutte le goroutine
var (
	tickMutex       sync.Mutex
	tickCond        = sync.NewCond(&tickMutex)
	currentTick     uint64 // Contatore dei tick per gli script Lua
	mplusNormalFont *text.GoTextFace
)

// --- Struct per la Gestione dei Dati ---

// Script rappresenta un singolo script Lua da eseguire
type Script struct {
	ID   string
	Code string
}

// ScreenMessage rappresenta un messaggio da visualizzare sullo schermo
type ScreenMessage struct {
	Text     string
	Lifetime int // Quanti frame di Ebiten deve rimanere visibile
	YOffset  int // Posizione verticale
}

// Game è la struct principale di Ebiten che contiene tutto lo stato
type Game struct {
	// Canale per ricevere messaggi dalle goroutine Lua
	messageChannel chan string

	// Lista dei messaggi attualmente visibili sullo schermo
	messagesOnScreen []*ScreenMessage
	messagesMutex    sync.Mutex // Mutex per proteggere l'accesso a messagesOnScreen

	// Contatore per generare i tick di Lua dal loop di Ebiten
	ebitenTickCounter int

	// WaitGroup per sapere quando tutti gli script Lua sono terminati
	luaScriptsWg sync.WaitGroup

	// Gestore delle risorse
	resourceManager *ResourceManager
}

// --- Inizializzazione ---

func init() {
	// Carica il font all'avvio del programma
	fontData := bytes.NewReader(fonts.MPlus1pRegular_ttf)

	faceSource, err := text.NewGoTextFaceSource(fontData)
	if err != nil {
		log.Fatal(err)
	}

	mplusNormalFont = &text.GoTextFace{
		Source: faceSource,
		Size:   24,
	}
}

// --- Logica degli Script Lua (leggermente modificata) ---

// internalWait rimane invariato, è il cuore della sincronizzazione
func internalWait(L *lua.LState, ticksToWait int) {
	if ticksToWait <= 0 {
		return
	}
	tickMutex.Lock()
	targetTick := currentTick + uint64(ticksToWait)
	for currentTick < targetTick {
		tickCond.Wait()
	}
	tickMutex.Unlock()
}

// luaHostWait rimane invariato
func luaHostWait(L *lua.LState) int {
	ticks := L.CheckInt(1)
	if ticks < 0 {
		L.RaiseError("wait: l'argomento deve essere un intero non negativo")
		return 0
	}
	internalWait(L, ticks)
	return 0
}

// luaHostPrint ora invia il messaggio a un canale invece di stamparlo su console
func luaHostPrint(L *lua.LState, msgChan chan<- string) int {
	registryTable := L.Get(lua.RegistryIndex)
	scriptIDVal := L.GetField(registryTable, "script_id")
	scriptID := "UNKNOWN"
	if id, ok := scriptIDVal.(lua.LString); ok {
		scriptID = string(id)
	}

	message := L.CheckString(1)

	// Combina l'ID dello script e il messaggio
	fullMessage := fmt.Sprintf("[%s] %s", scriptID, message)

	// Invia il messaggio al canale per essere raccolto da Ebiten
	msgChan <- fullMessage

	// Mantiene la pausa originale
	const ticksToWaitAfterPrint = 180
	internalWait(L, ticksToWaitAfterPrint)
	return 0
}

// runLuaScript ora accetta il canale dei messaggi e il resource manager
func runLuaScript(script Script, wg *sync.WaitGroup, msgChan chan<- string, rm *ResourceManager) {
	defer wg.Done()
	log.Printf("Go: Preparazione per l'esecuzione dello script '%s'...", script.ID)

	L := lua.NewState()
	defer L.Close()

	// Usa una closure per passare il canale alla funzione print
	printFunc := func(L *lua.LState) int {
		return luaHostPrint(L, msgChan)
	}

	registryTable := L.Get(lua.RegistryIndex)
	L.SetField(registryTable, "script_id", lua.LString(script.ID))
	L.SetGlobal("wait", L.NewFunction(luaHostWait))
	L.SetGlobal("print", L.NewFunction(printFunc))
	
	// Registra le funzioni per la gestione delle risorse
	L.SetGlobal("setFont", L.NewFunction(luaSetFont(rm)))
	L.SetGlobal("setCursor", L.NewFunction(luaSetCursor(rm)))
	L.SetGlobal("listResources", L.NewFunction(luaListResources(rm)))

	if err := L.DoString(script.Code); err != nil {
		log.Printf("Go: ERRORE durante l'esecuzione dello script '%s': %v", script.ID, err)
	} else {
		log.Printf("Go: Script '%s' completato con successo.", script.ID)
	}
}

// --- Metodi del Game Loop di Ebiten ---

// Update gestisce la logica del gioco ad ogni frame
func (g *Game) Update() error {

	if inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft) {
		g.luaScriptsWg.Add(1)

		s := Script{
			ID:   "Test Script",
			Code: "print(\"Test Script\")",
		}

		go runLuaScript(s, &g.luaScriptsWg, g.messageChannel, g.resourceManager)
	}

	// Se l'utente preme ESC, termina il gioco.
	if ebiten.IsKeyPressed(ebiten.KeyEscape) {
		return ebiten.Termination
	}

	// Controlla se la chiusura della finestra è stata richiesta.
	// Questo è necessario per far funzionare il pulsante di chiusura della finestra.
	if ebiten.IsWindowBeingClosed() {
		return ebiten.Termination
	}

	// Gestione dei messaggi in arrivo dal canale
MessageProcessingLoop: // Questa è un'etichetta per il nostro loop
	for {
		select {
		case msg, ok := <-g.messageChannel:
			if !ok {
				// Il canale è stato chiuso e svuotato.
				// Disabilitiamo questo case per le iterazioni future.
				//g.messageChannel = nil
				// Poiché il canale è chiuso, non ci sono più messaggi.
				// Possiamo uscire dal loop di processamento.
				break MessageProcessingLoop
			}
			log.Printf("Ebiten: Ricevuto messaggio da Lua: %s", msg)
			g.messagesMutex.Lock()
			// Aggiungi il nuovo messaggio in cima alla lista
			newMsg := &ScreenMessage{Text: msg, Lifetime: messageLifetimeTicks}
			g.messagesOnScreen = append([]*ScreenMessage{newMsg}, g.messagesOnScreen...)
			// Limita il numero di messaggi a schermo
			if len(g.messagesOnScreen) > 10 {
				g.messagesOnScreen = g.messagesOnScreen[:10]
			}
			g.messagesMutex.Unlock()
		default:
			// Nessun messaggio, prosegui
			break MessageProcessingLoop
		}
	}

	// Aggiorna la vita dei messaggi esistenti e rimuovi quelli scaduti
	g.messagesMutex.Lock()
	var activeMessages []*ScreenMessage
	for _, msg := range g.messagesOnScreen {
		msg.Lifetime--
		if msg.Lifetime > 0 {
			activeMessages = append(activeMessages, msg)
		}
	}
	g.messagesOnScreen = activeMessages
	g.messagesMutex.Unlock()

	// Logica per generare i tick per Lua

	g.ebitenTickCounter++
	// Un tick di Ebiten è 1/60 di secondo. Un tick Lua è 1 secondo.
	// Quindi, un tick Lua avviene ogni 60 tick di Ebiten.
	if g.ebitenTickCounter >= int(luaTickDuration.Seconds()*float64(ebiten.TPS())) {
		g.ebitenTickCounter = 0 // Resetta il contatore

		tickMutex.Lock()
		currentTick++
		log.Printf("Go Tick: %d", currentTick)
		tickCond.Broadcast() // Risveglia tutti gli script Lua in attesa
		tickMutex.Unlock()
	}

	return nil
}

// Draw disegna lo stato del gioco sullo schermo
func (g *Game) Draw(screen *ebiten.Image) {
	screen.Fill(color.RGBA{R: 0x10, G: 0x10, B: 0x30, A: 0xff}) // Sfondo scuro

	// Disegna i messaggi
	g.messagesMutex.Lock()
	defer g.messagesMutex.Unlock()

	// Usa il font corrente dal resource manager
	currentFont := g.resourceManager.GetCurrentFont()
	if currentFont == nil {
		currentFont = mplusNormalFont // Fallback al font di default
	}

	yPos := 50
	for _, msg := range g.messagesOnScreen {
		// Calcola l'opacità in base alla vita rimasta
		alpha := 1.0
		if msg.Lifetime < 60 { // Inizia a svanire nell'ultimo secondo
			alpha = float64(msg.Lifetime) / 60.0
		}
		textColor := color.RGBA{R: 0xff, G: 0xff, B: 0xff, A: uint8(255 * alpha)}

		drawOptions := &text.DrawOptions{}
		drawOptions.ColorScale.ScaleWithColor(textColor)
		drawOptions.GeoM.Translate(20, float64(yPos)) // Posiziona il testo
		text.Draw(screen, msg.Text, currentFont, drawOptions)

		yPos += 30
	}

	// Messaggio di stato in basso
	statusMsg := "Tutti gli script sono terminati. Premi ESC per uscire."

	statusMsg = fmt.Sprintf("Esecuzione in corso... Go Tick: %d", currentTick)

	drawOptions := &text.DrawOptions{}
	drawOptions.ColorScale.ScaleWithColor(color.White)
	drawOptions.GeoM.Translate(20, screenHeight-30) // Posiziona il testo

	text.Draw(screen, statusMsg, mplusNormalFont, drawOptions)
}

// Layout definisce la dimensione logica dello schermo
func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return screenWidth, screenHeight
}

// --- Funzione Principale ---

func main() {
	log.SetFlags(log.Ltime | log.Lmicroseconds)

	// Definiamo gli script da eseguire
	scriptsToRun := []Script{
		{ID: "SCRIPT 1 (Breve)", Code: `print("Ciao dal primo script!"); wait(120); print("Script 1 terminato.")`},
		{ID: "SCRIPT 2 (Lungo)", Code: `print("Inizio dello script 2."); wait(240); print("Script 2 a metà."); wait(180); print("Script 2 terminato.")`},
		{ID: "SCRIPT 3 (Veloce)", Code: `wait(60); print("Lo script 3 si è attivato."); print("Script 3 terminato.")`},
		{ID: "DEMO RISORSE", Code: `
print("=== DEMO GESTIONE RISORSE ===")
local resources = listResources()
print("Font: " .. #resources.fonts .. ", Immagini: " .. #resources.images .. ", Cursori: " .. #resources.cursors)
print("Cambio font a title...")
setFont("title")
print("Font grande attivo!")
wait(120)
print("Cambio cursore a pointer...")
setCursor("pointer")
wait(120)
print("Torno al default...")
setFont("default")
setCursor("default")
print("Demo completata!")
`},
	}

	// Crea l'istanza del gioco
	game := &Game{
		messageChannel: make(chan string, 10), // Canale bufferato
	}

	log.Println("Go: Avvio di tutti gli script Lua in goroutine separate...")
	// Inizializza il resource manager
	game.resourceManager = NewResourceManager()
	game.resourceManager.InitializeDefaultResources()
	
	// Carica le risorse dal file di configurazione
	if err := LoadResourcesFromConfig(game.resourceManager, "resources.json"); err != nil {
		log.Printf("Avviso: Errore nel caricamento delle risorse: %v", err)
		// Carica almeno il font di default
		game.resourceManager.LoadFont("default", fonts.MPlus1pRegular_ttf, 24)
	}
	
	// Imposta il font di default
	game.resourceManager.SetFont("default")

	for _, script := range scriptsToRun {
		game.luaScriptsWg.Add(1)
		go runLuaScript(script, &game.luaScriptsWg, game.messageChannel, game.resourceManager)
	}

	// Goroutine per attendere la fine di tutti gli script
	/*
		go func() {
			game.luaScriptsWg.Wait()
			log.Println("Go: Tutti gli script hanno terminato.")
			game.allScriptsDone = true
			close(game.messageChannel)
		}()
	*/

	// Avvia il loop di Ebiten
	ebiten.SetWindowSize(screenWidth, screenHeight)
	ebiten.SetWindowTitle("Go + Lua + Ebiten Demo")
	if err := ebiten.RunGame(game); err != nil {
		log.Fatal(err)
	}

	log.Println("Go: Programma terminato.")
}
