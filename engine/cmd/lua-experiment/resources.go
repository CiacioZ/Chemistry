package main

import (
	"bytes"
	"fmt"
	"image"
	"log"
	"sync"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/text/v2"
	lua "github.com/yuin/gopher-lua"
)

// ResourceManager gestisce tutte le risorse del gioco
type ResourceManager struct {
	fonts   map[string]*text.GoTextFace
	images  map[string]*ebiten.Image
	cursors map[string]ebiten.CursorShapeType
	mutex   sync.RWMutex

	// Risorse attualmente attive
	currentFont   *text.GoTextFace
	currentCursor ebiten.CursorShapeType
}

// NewResourceManager crea un nuovo gestore risorse
func NewResourceManager() *ResourceManager {
	return &ResourceManager{
		fonts:         make(map[string]*text.GoTextFace),
		images:        make(map[string]*ebiten.Image),
		cursors:       make(map[string]ebiten.CursorShapeType),
		currentCursor: ebiten.CursorShapeDefault,
	}
}

// LoadFont carica un font da dati binari
func (rm *ResourceManager) LoadFont(name string, fontData []byte, size float64) error {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	reader := bytes.NewReader(fontData)
	faceSource, err := text.NewGoTextFaceSource(reader)
	if err != nil {
		return fmt.Errorf("errore nel caricamento del font %s: %v", name, err)
	}

	rm.fonts[name] = &text.GoTextFace{
		Source: faceSource,
		Size:   size,
	}

	log.Printf("Font '%s' caricato con successo (dimensione: %.1f)", name, size)
	return nil
}

// LoadImage carica un'immagine da dati binari
func (rm *ResourceManager) LoadImage(name string, imageData []byte) error {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	reader := bytes.NewReader(imageData)
	img, _, err := image.Decode(reader)
	if err != nil {
		return fmt.Errorf("errore nel caricamento dell'immagine %s: %v", name, err)
	}

	rm.images[name] = ebiten.NewImageFromImage(img)
	log.Printf("Immagine '%s' caricata con successo", name)
	return nil
}

// RegisterCursor registra un tipo di cursore
func (rm *ResourceManager) RegisterCursor(name string, cursorShape ebiten.CursorShapeType) {
	rm.mutex.Lock()
	defer rm.mutex.Unlock()

	rm.cursors[name] = cursorShape
	log.Printf("Cursore '%s' registrato", name)
}

// SetFont imposta il font corrente
func (rm *ResourceManager) SetFont(name string) error {
	rm.mutex.RLock()
	font, exists := rm.fonts[name]
	rm.mutex.RUnlock()

	if !exists {
		return fmt.Errorf("font '%s' non trovato", name)
	}

	rm.mutex.Lock()
	rm.currentFont = font
	rm.mutex.Unlock()

	log.Printf("Font corrente impostato a: %s", name)
	return nil
}

// SetCursor imposta il cursore corrente
func (rm *ResourceManager) SetCursor(name string) error {
	rm.mutex.RLock()
	cursor, exists := rm.cursors[name]
	rm.mutex.RUnlock()

	if !exists {
		return fmt.Errorf("cursore '%s' non trovato", name)
	}

	rm.mutex.Lock()
	rm.currentCursor = cursor
	rm.mutex.Unlock()

	ebiten.SetCursorShape(cursor)
	log.Printf("Cursore corrente impostato a: %s", name)
	return nil
}

// GetCurrentFont restituisce il font corrente
func (rm *ResourceManager) GetCurrentFont() *text.GoTextFace {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()
	return rm.currentFont
}

// GetImage restituisce un'immagine per nome
func (rm *ResourceManager) GetImage(name string) (*ebiten.Image, error) {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	img, exists := rm.images[name]
	if !exists {
		return nil, fmt.Errorf("immagine '%s' non trovata", name)
	}
	return img, nil
}

// ListResources elenca tutte le risorse caricate
func (rm *ResourceManager) ListResources() ([]string, []string, []string) {
	rm.mutex.RLock()
	defer rm.mutex.RUnlock()

	var fonts, images, cursors []string

	for name := range rm.fonts {
		fonts = append(fonts, name)
	}
	for name := range rm.images {
		images = append(images, name)
	}
	for name := range rm.cursors {
		cursors = append(cursors, name)
	}

	return fonts, images, cursors
}

// --- Funzioni Lua per la gestione delle risorse ---

// luaSetFont imposta il font corrente tramite Lua
func luaSetFont(rm *ResourceManager) func(*lua.LState) int {
	return func(L *lua.LState) int {
		fontName := L.CheckString(1)
		
		err := rm.SetFont(fontName)
		if err != nil {
			L.RaiseError("setFont: %s", err.Error())
			return 0
		}
		
		return 0
	}
}

// luaSetCursor imposta il cursore corrente tramite Lua
func luaSetCursor(rm *ResourceManager) func(*lua.LState) int {
	return func(L *lua.LState) int {
		cursorName := L.CheckString(1)
		
		err := rm.SetCursor(cursorName)
		if err != nil {
			L.RaiseError("setCursor: %s", err.Error())
			return 0
		}
		
		return 0
	}
}

// luaListResources elenca le risorse disponibili tramite Lua
func luaListResources(rm *ResourceManager) func(*lua.LState) int {
	return func(L *lua.LState) int {
		fonts, images, cursors := rm.ListResources()
		
		// Crea una tabella Lua con le risorse
		table := L.NewTable()
		
		// Aggiungi fonts
		fontTable := L.NewTable()
		for i, font := range fonts {
			fontTable.RawSetInt(i+1, lua.LString(font))
		}
		table.RawSetString("fonts", fontTable)
		
		// Aggiungi images
		imageTable := L.NewTable()
		for i, img := range images {
			imageTable.RawSetInt(i+1, lua.LString(img))
		}
		table.RawSetString("images", imageTable)
		
		// Aggiungi cursors
		cursorTable := L.NewTable()
		for i, cursor := range cursors {
			cursorTable.RawSetInt(i+1, lua.LString(cursor))
		}
		table.RawSetString("cursors", cursorTable)
		
		L.Push(table)
		return 1
	}
}

// InitializeDefaultResources carica le risorse di base
func (rm *ResourceManager) InitializeDefaultResources() {
	// Registra i cursori di base
	rm.RegisterCursor("default", ebiten.CursorShapeDefault)
	rm.RegisterCursor("text", ebiten.CursorShapeText)
	rm.RegisterCursor("crosshair", ebiten.CursorShapeCrosshair)
	rm.RegisterCursor("pointer", ebiten.CursorShapePointer)
	rm.RegisterCursor("ew-resize", ebiten.CursorShapeEWResize)
	rm.RegisterCursor("ns-resize", ebiten.CursorShapeNSResize)
}