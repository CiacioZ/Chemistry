package logic

import (
	"bytes"
	"chemistry/engine/model"
	"fmt"
	"image"
	"image/color"
	"log"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
	"github.com/hajimehoshi/ebiten/v2/text/v2"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

type Game struct {
	data  GameData
	state GameState
}

func NewGame() Game {
	return Game{
		data:  initGameData(),
		state: initGameState(),
	}
}

func (g *Game) Update() error {

	g.updateTextToDrawTimer() // Estrai la logica del timer del testo

	defer g.state.CalculateYOrderedEntities()

	// Gestisci l'input prima di aggiornare lo stato
	err := g.handleInput()
	if err != nil {
		return err // Ad esempio, se viene premuto ESC
	}

	// Aggiorna lo stato in base allo stato corrente
	switch g.GetCurrentState() {
	case model.EXECUTING_ACTION:
		g.updateExecutingActionState()
	case model.IDLE:
		g.updateIdleState()
	case model.WAITING_ACTION:
		g.updateWaitingActionState()
		// Aggiungi altri stati se necessario
	}

	// Aggiorna la posizione della camera (potrebbe essere estratta)
	g.updateCameraPosition()

	return nil
}

// Nuova funzione per gestire il timer del testo
func (g *Game) updateTextToDrawTimer() {
	if len(g.state.textToDraw) > 0 {
		textDrawnElapsed := time.Since(g.state.textDrawn).Milliseconds()
		if textDrawnElapsed >= 2500 {
			if len(g.state.textToDraw) == 1 {
				g.state.textToDraw = make([]string, 0)
			} else {
				g.state.textToDraw = g.state.textToDraw[1:]
			}
			g.state.textDrawn = time.Now()
		}
	} else {
		g.state.textDrawn = time.Now()
	}
}

// Nuova funzione per gestire l'input
func (g *Game) handleInput() error {
	cursorX, cursorY := g.state.camera.ScreenToWorld(ebiten.CursorPosition())
	g.state.cursorOnItem = g.ItemAt(int(cursorX), int(cursorY))

	switch {
	case inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft):
		g.handleLeftClick() // Estrai la logica del click sinistro
	case inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonRight):
		g.handleRightClick() // Estrai la logica del click destro
	case ebiten.IsKeyPressed(ebiten.KeyEscape):
		return ebiten.Termination // Gestisci l'uscita qui
	}
	return nil
}

// Nuova funzione per gestire il click sinistro (da popolare con la logica esistente)
func (g *Game) handleLeftClick() {
	switch g.GetCurrentState() {
	case model.IDLE:

		if g.state.cursorOnItem != "" {

			selectedItemId := g.state.cursorOnItem
			item := g.GetItem(selectedItemId)
			if item.UseWith && g.GetCurrentVerb() == model.USE {
				g.state.mainItemID = selectedItemId
				g.SetCurrentState(model.WAITING_ACTION)
			} else {
				trigger := composeTrigger(g.state.currentCharacter.ID, g.state.currentVerb, g.state.cursorOnItem, model.NOTHING, g.state.currentLocation.ID)
				location := g.GetCurrentLocation()
				g.MoveTo(location.Items[item.ID].InteractionPoint.X, location.Items[item.ID].InteractionPoint.Y)

				g.state.watingActions = append(g.state.watingActions, trigger)

			}
		}

		switch g.GetCurrentVerb() {
		case model.MOVE_TO:
			worldX, worldY := g.state.camera.ScreenToWorld(ebiten.CursorPosition())

			g.MoveTo(int(worldX), int(worldY))
		default:
			g.SetCurrentVerb(model.MOVE_TO)
		}
	case model.WAITING_ACTION:

		if g.state.cursorOnItem != "" {

			selectedItemId := g.state.cursorOnItem
			g.state.secondItemID = selectedItemId

			trigger := composeTrigger(g.state.currentCharacter.ID, g.state.currentVerb, g.state.cursorOnItem, selectedItemId, g.state.currentLocation.ID)
			g.ExecuteAction(trigger)

			g.state.mainItemID = ""
			g.state.secondItemID = ""
			g.SetCurrentState(model.IDLE)
			g.SetCurrentVerb(model.MOVE_TO)
		}

	case model.EXECUTING_ACTION:

		switch g.GetCurrentVerb() {
		case model.MOVE_TO:
			worldX, worldY := g.state.camera.ScreenToWorld(ebiten.CursorPosition())

			g.MoveTo(int(worldX), int(worldY))
		}

	}
}

// Nuova funzione per gestire il click destro (da popolare con la logica esistente)
func (g *Game) handleRightClick() {

	switch g.GetCurrentVerb() {
	case model.MOVE_TO:
		g.SetCurrentVerb(model.LOOK_AT)
	case model.LOOK_AT:
		g.SetCurrentVerb(model.PICK_UP)
	case model.PICK_UP:
		g.SetCurrentVerb(model.USE)
	case model.USE:
		g.SetCurrentVerb(model.TALK_TO)
	case model.TALK_TO:
		g.SetCurrentVerb(model.GIVE_TO)
	case model.GIVE_TO:
		g.SetCurrentVerb(model.MOVE_TO)
	}
}

// Nuova funzione per aggiornare lo stato EXECUTING_ACTION
func (g *Game) updateExecutingActionState() {

	if len(g.state.watingActions) == 0 {
		g.SetCurrentState(model.IDLE)
		return
	}

	triggerAction := g.state.watingActions[0]
	triggerActionParts := strings.Split(triggerAction, ".")
	currentActionVerb := model.Verb(triggerActionParts[1])
	switch currentActionVerb {
	case model.MOVE_TO:
		g.updateMoveToAction() // Estrai la logica di MOVE_TO
	default:
		// ... logica per altre azioni ...
		g.ExecuteAction(g.state.watingActions[0])
		if len(g.state.watingActions) > 1 {
			g.state.watingActions = g.state.watingActions[1:]
		} else {
			g.SetCurrentState(model.IDLE)
			g.state.watingActions = make([]string, 0)
		}
	}
}

// Nuova funzione specifica per l'aggiornamento dell'azione MOVE_TO
func (g *Game) updateMoveToAction() {
	if len(g.state.watingActions) == 0 {
		// Should not happen if called from updateExecutingActionState, but good practice
		g.SetCurrentState(model.IDLE)
		return
	}

	triggerAction := g.state.watingActions[0]
	triggerActionParts := strings.Split(triggerAction, ".")

	if triggerActionParts[3] == model.NOTHING {
		// Handle MOVE_TO NOTHING (e.g., interacting with an object without moving)
		g.ExecuteAction(g.state.watingActions[0])
		if len(g.state.watingActions) > 1 {
			g.state.watingActions = g.state.watingActions[1:]
		} else {
			g.SetCurrentState(model.IDLE)
			g.state.watingActions = make([]string, 0)
		}
		return
	}

	start := triggerActionParts[2]
	startParts := strings.Split(start, ":")
	startX, errX1 := strconv.Atoi(startParts[0])
	startY, errY1 := strconv.Atoi(startParts[1])

	destination := triggerActionParts[3]
	destinationParts := strings.Split(destination, ":")
	destinationX, errX2 := strconv.Atoi(destinationParts[0])
	destinationY, errY2 := strconv.Atoi(destinationParts[1])

	// Basic error handling for coordinate conversion
	if errX1 != nil || errY1 != nil || errX2 != nil || errY2 != nil {
		log.Printf("Error converting coordinates in trigger: %s. Errors: %v, %v, %v, %v", triggerAction, errX1, errY1, errX2, errY2)
		// Decide how to handle the error: skip action, stop game, etc.
		// For now, let's skip this action and go idle.
		g.state.watingActions = make([]string, 0)
		g.SetCurrentState(model.IDLE)
		return
	}

	position := g.GetCurrentCharacterPosition()

	// Check if destination is reached
	if position.X == destinationX && position.Y == destinationY {
		// Destination reached for this segment
		if len(g.state.watingActions) > 1 {
			nextTriggerParts := strings.Split(g.state.watingActions[1], ".")
			// Check if the next action is also a MOVE_TO to continue pathfinding smoothly
			if len(nextTriggerParts) > 3 && model.Verb(nextTriggerParts[1]) == model.MOVE_TO && nextTriggerParts[3] != model.NOTHING {
				g.state.pathPointIndex = 0 // Reset index for the new segment
				g.state.watingActions = g.state.watingActions[1:]
				// Keep state as EXECUTING_ACTION
			} else {
				// Next action is different, stop moving animation
				g.state.watingActions = g.state.watingActions[1:]
				g.StopCharacterMovementAnimation() // Use a helper function
				// State will be set by the next action's logic or go IDLE if none left
			}
		} else {
			// No more actions, stop moving animation and go idle
			g.state.watingActions = make([]string, 0)
			g.StopCharacterMovementAnimation() // Use a helper function
			g.SetCurrentState(model.IDLE)
		}
		return // Finished processing this segment
	}

	// --- Movement logic ---
	// Calculate direction and set animation only at the start of a segment
	if g.state.pathPointIndex == 0 {
		angle := math.Atan2(float64(destinationY-startY), float64(destinationX-startX)) * 180 / math.Pi

		var targetDirection model.CharacterDirection
		var targetAnimation string

		switch {
		case angle >= -45 && angle <= 45:
			targetDirection = model.RIGHT
			targetAnimation = string(model.WALK_LEFT_TO_RIGHT)
		case angle > 45 && angle < 135:
			targetDirection = model.DOWN
			targetAnimation = string(model.WALK_UP_TO_DOWN)
		case angle >= 135 || angle <= -135:
			targetDirection = model.LEFT
			targetAnimation = string(model.WALK_RIGHT_TO_LEFT)
		case angle > -135 && angle < -45:
			targetDirection = model.UP
			targetAnimation = string(model.WALK_DOWN_TO_UP)
		}

		if g.GetCurrentCharacterDirection() != targetDirection {
			g.SetCurrentCharacterDirection(targetDirection)
			g.SetCurrentCharacterAnimationFrame(0) // Reset frame when changing direction
		}
		g.SetCurrentCharacterAnimation(targetAnimation)
	}

	// Advance animation frame based on time
	elapsed := time.Since(g.state.lastUpdated).Milliseconds()
	if elapsed >= 96 { // Consider making this duration a constant or configurable
		g.state.lastUpdated = time.Now()
		g.AdvanceCurrentAnimationFrame()
	}

	// Calculate path points and move character
	// Note: CalculateLine might be inefficient if called every frame.
	// Consider calculating it once per segment if performance is an issue.
	points := model.CalculateLine(startX, startY, destinationX, destinationY)
	if len(points) > 0 {
		// Ensure pathPointIndex is within bounds
		if g.state.pathPointIndex >= len(points) {
			g.state.pathPointIndex = len(points) - 1
		}

		point := points[g.state.pathPointIndex]
		g.SetCurrentCharacterPosition(point)

		// Increment path index (adjust step size as needed for speed)
		g.state.pathPointIndex += 2 // Move 2 pixels per update cycle?

		// Check again if the destination is reached after moving
		if point.X == destinationX && point.Y == destinationY {
			// Re-run the destination reached logic in the next frame
			// to handle action queue correctly.
			// Set pathPointIndex to a value that ensures the destination check passes next time.
			g.state.pathPointIndex = len(points) - 1 // Or force position update
			g.SetCurrentCharacterPosition(image.Point{X: destinationX, Y: destinationY})

		} else if g.state.pathPointIndex >= len(points) {
			// If we overshot or reached the end of points array but not exact coords
			g.state.pathPointIndex = len(points) - 1
			g.SetCurrentCharacterPosition(image.Point{X: destinationX, Y: destinationY}) // Snap to destination
		}
	} else {
		// No path found or start == destination, snap to destination
		g.SetCurrentCharacterPosition(image.Point{X: destinationX, Y: destinationY})
		// Re-run the destination reached logic in the next frame
	}
}

// Helper function to set idle animation based on current direction
func (g *Game) StopCharacterMovementAnimation() {
	switch g.GetCurrentCharacterDirection() {
	case model.DOWN:
		g.SetCurrentCharacterAnimationAtFrame(string(model.IDLE_FACE_DOWN), 0)
	case model.RIGHT:
		g.SetCurrentCharacterAnimationAtFrame(string(model.IDLE_FACE_RIGHT), 0)
	case model.LEFT:
		g.SetCurrentCharacterAnimationAtFrame(string(model.IDLE_FACE_LEFT), 0)
	case model.UP:
		g.SetCurrentCharacterAnimationAtFrame(string(model.IDLE_FACE_UP), 0)
	}
}

// Nuova funzione per aggiornare lo stato IDLE
func (g *Game) updateIdleState() {
	// TODO: Sposta qui eventuale logica specifica dello stato IDLE
	//       che non sia gestione dell'input (già in handleInput).
	//       Al momento sembra vuota, ma potrebbe servire in futuro.
}

// Nuova funzione per aggiornare lo stato WAITING_ACTION
func (g *Game) updateWaitingActionState() {
	// TODO: Sposta qui eventuale logica specifica dello stato WAITING_ACTION
	//       che non sia gestione dell'input (già in handleInput).
	//       Al momento sembra vuota, ma potrebbe servire in futuro.
}

// Nuova funzione per aggiornare la posizione della camera
func (g *Game) updateCameraPosition() {
	targetCameraX := float64(g.state.currentCharacterPosition.X - (screenWidth / 2))

	// Clamp camera position to background bounds
	maxCameraX := float64(g.state.currentBackGround.Bounds().Dx() - screenWidth)
	if targetCameraX < 0 {
		targetCameraX = 0
	} else if targetCameraX > maxCameraX {
		targetCameraX = maxCameraX
	}

	g.state.camera.Position[0] = targetCameraX

	// Implement vertical camera scrolling
	targetCameraY := float64(g.state.currentCharacterPosition.Y - (screenHeight / 2))

	// Clamp camera position to background bounds
	maxCameraY := float64(g.state.currentBackGround.Bounds().Dy() - screenHeight)
	if targetCameraY < 0 {
		targetCameraY = 0
	} else if targetCameraY > maxCameraY {
		targetCameraY = maxCameraY
	}

	g.state.camera.Position[1] = targetCameraY
}

func (g *Game) Draw(screen *ebiten.Image) {

	// Disegna lo sfondo della location corrente (se presente)
	g.drawBackground(g.state.world, g.GetCurrentLocation())

	currentCharacter := g.GetCurrentCharacter()

	// Disegna tutte le entità nell'ordine calcolato
	for _, entityID := range g.state.yOrderedEntities {
		if entityID == currentCharacter.ID {
			// Disegna il personaggio del giocatore
			g.drawCharacter(g.state.world, currentCharacter)
		} else {
			// Disegna l'oggetto
			item := g.data.Items[entityID]
			itemLocation := g.GetCurrentLocation().Items[entityID]
			g.drawItem(g.state.world, item, itemLocation)
		}
	}

	// Scrive eventuali code che il personaggio deve dire
	g.drawText(g.state.world, currentCharacter)

	// Disegna l'interfaccia utente e le informazioni di debug
	g.drawUI(g.state.world)

	g.drawCursor(g.state.world)

	g.state.camera.Render(g.state.world, screen)
}

func (g *Game) drawText(screen *ebiten.Image, currentCharacter model.Character) {

	if len(g.state.textToDraw) > 0 {

		standard, err := text.NewGoTextFaceSource(bytes.NewReader(g.data.Fonts["MonkeyIsland"]))
		if err != nil {
			log.Fatal(err)
		}
		fontFaceSource := standard

		outline, err := text.NewGoTextFaceSource(bytes.NewReader(g.data.Fonts["MonkeyIslandOutline"]))
		if err != nil {
			log.Fatal(err)
		}
		fontFaceOutlineSource := outline

		talkColor := color.RGBA{
			R: currentCharacter.TalkColor.R,
			G: currentCharacter.TalkColor.G,
			B: currentCharacter.TalkColor.B,
			A: 255,
		}

		animation, frame := g.GetCurrentCharacterAnimation()
		characterFrameImage := g.GetCurrentCharacter().Animations[animation][frame]

		_, spriteHeight := g.GetSpriteDimensions(characterFrameImage)
		textToDisplay := g.state.textToDraw[0]
		fontSize := 24.0 // Assuming a fixed font size, adjust if dynamic

		// Create a face for measuring text
		goTextFace := &text.GoTextFace{
			Source: fontFaceSource, // or fontFaceOutlineSource, assuming they have similar metrics
			Size:   fontSize,
		}
		textAdvance, textHeight := text.Measure(textToDisplay, goTextFace, goTextFace.Size*2) // Using Size*2 for line height, adjust if needed
		textWidth := float64(textAdvance)

		// Calculate initial desired position (above character, centered)
		charScaledHeight := float64(spriteHeight) * 2.5 // Assuming character is scaled by 2.5 as in drawCharacter

		// Calculate the desired text center X and top Y in world coordinates
		worldTextCenterX := float64(g.state.currentCharacterPosition.X)
		worldTextTopY := float64(g.state.currentCharacterPosition.Y) - charScaledHeight - textHeight - 20.0

		// What are the visible world coordinates on screen?
		margin := 5.0 // Small margin from screen edges
		halfTextWidth := textWidth / 2.0

		// Adjust worldTextCenterX so the text stays on screen
		visibleWorldLeft := g.state.camera.Position[0] + margin
		visibleWorldRight := g.state.camera.Position[0] + screenWidth - margin

		if worldTextCenterX-halfTextWidth < visibleWorldLeft {
			worldTextCenterX = visibleWorldLeft + halfTextWidth
		} else if worldTextCenterX+halfTextWidth > visibleWorldRight {
			worldTextCenterX = visibleWorldRight - halfTextWidth
		}

		// Adjust text's top Y
		visibleWorldTopEdge := g.state.camera.Position[1] + margin
		visibleWorldBottomEdge := g.state.camera.Position[1] + screenHeight - margin - textHeight // Space for text height

		if worldTextTopY < visibleWorldTopEdge {
			worldTextTopY = visibleWorldTopEdge
		} else if worldTextTopY > visibleWorldBottomEdge { // worldTextTopY is already the top of the text
			worldTextTopY = visibleWorldBottomEdge
		}

		opRegular := &text.DrawOptions{}
		opRegular.GeoM.Translate(worldTextCenterX, worldTextTopY)
		opRegular.ColorScale.ScaleWithColor(talkColor)
		opRegular.PrimaryAlign = text.AlignCenter                      // Horizontal alignment
		opRegular.SecondaryAlign = text.AlignStart                     // Vertical alignment (Y is top)
		text.Draw(g.state.world, textToDisplay, goTextFace, opRegular) // Draw onto the world image

		opOutline := &text.DrawOptions{}
		opOutline.GeoM.Translate(worldTextCenterX, worldTextTopY)
		opOutline.ColorScale.ScaleWithColor(color.Black)
		opOutline.PrimaryAlign = text.AlignCenter
		opOutline.SecondaryAlign = text.AlignStart
		text.Draw(g.state.world, textToDisplay, &text.GoTextFace{ // Use a new face for outline if needed, or reuse
			Source: fontFaceOutlineSource,
			Size:   fontSize,
		}, opOutline)
	}

}

func (g *Game) drawBackground(screen *ebiten.Image, location model.Location) {

	op := &ebiten.DrawImageOptions{}

	screen.DrawImage(g.state.currentBackGround, op)

	for _, polygon := range location.GetWalkableArea(0).Polygons {
		for from, point := range polygon {
			to := from + 1
			if from == len(polygon)-1 {
				to = 0
			}
			vector.StrokeLine(screen, float32(point.X), float32(point.Y), float32(polygon[to].X), float32(polygon[to].Y), 1, color.White, false)
		}
	}
}

func (g *Game) drawCharacter(screen *ebiten.Image, character model.Character) {
	animation, frame := g.GetCurrentCharacterAnimation()
	characterFrameImage := character.Animations[animation][frame]

	frameImage, _, err := image.Decode(bytes.NewReader(characterFrameImage))
	if err != nil {
		log.Fatal(err)
	}

	img := ebiten.NewImageFromImage(frameImage)

	refPoint := image.Point{
		X: int(float32(img.Bounds().Dx())*2.5) / 2,
		Y: int(float32(img.Bounds().Dy()) * 2.5),
	}
	op := &ebiten.DrawImageOptions{}
	op.GeoM.Scale(2.5, 2.5)
	op.GeoM.Translate(float64(g.state.currentCharacterPosition.X-refPoint.X), float64(g.state.currentCharacterPosition.Y-refPoint.Y))
	screen.DrawImage(img, op)
}

func (g *Game) drawItem(screen *ebiten.Image, item model.Item, itemLocation model.ItemLocation) {
	// TODO: Implementa il caricamento e il disegno dell'immagine dell'oggetto
	// Per ora, disegniamo un placeholder
	if len(item.Image) == 0 {
		vector.DrawFilledCircle(screen, float32(itemLocation.LocationPoint.X), float32(itemLocation.LocationPoint.Y), 3, color.RGBA{255, 0, 0, 255}, false)
	} else {
		itemImage, _, err := image.Decode(bytes.NewReader(item.Image))
		if err != nil {
			log.Fatal(err)
		}

		img := ebiten.NewImageFromImage(itemImage)
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(float64(itemLocation.LocationPoint.X), float64(itemLocation.LocationPoint.Y))

		screen.DrawImage(img, op)
	}

	vector.DrawFilledCircle(screen, float32(itemLocation.InteractionPoint.X), float32(itemLocation.InteractionPoint.Y), 2, color.RGBA{0, 255, 0, 255}, false)
}

func (g *Game) drawUI(screen *ebiten.Image) {

	/*
		if g.state.cursorOnItem != "" {
			ebitenutil.DebugPrintAt(screen, fmt.Sprintf("Cursor On Item: %s", g.state.cursorOnItem), 10, 150)
		}
	*/

	//ebitenutil.DebugPrintAt(screen, fmt.Sprintf("FPS: %0.2f", ebiten.ActualFPS()), 10, 10)
	//ebitenutil.DebugPrintAt(screen, fmt.Sprintf("TPS: %0.2f", ebiten.ActualTPS()), 10, 25)
	//ebitenutil.DebugPrintAt(screen, fmt.Sprintf("Location: %s", g.state.currentLocation.Name), 10, 40)
	ebitenutil.DebugPrintAt(screen, fmt.Sprintf("Verb: %s", g.state.currentVerb), 10, 10)
	// Aggiungi altre informazioni di debug secondo necessità
}

func (g *Game) drawCursor(screen *ebiten.Image) {

	x, y := g.state.camera.ScreenToWorld(ebiten.CursorPosition())

	x -= float64(g.state.currentCursor.Bounds().Dx() / 2)
	y -= float64(g.state.currentCursor.Bounds().Dy() / 2)

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(x, y)

	screen.DrawImage(g.state.currentCursor, op)

}

func (g *Game) ItemAt(x int, y int) string {
	for id, location := range g.state.currentLocation.Items {

		alphaImage := g.GetItem(id).Alpha

		if alphaImage.At(x-location.LocationPoint.X, y-location.LocationPoint.Y).(color.Alpha).A > 0 {
			return id
		}
	}

	return ""
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return screenWidth, screenHeight
}

func (g *Game) MoveTo(x int, y int) {
	destination := image.Point{
		X: x,
		Y: y,
	}

	path := g.state.pathFinder.Path(g.GetCurrentCharacterPosition(), destination)
	g.state.watingActions = make([]string, 0)
	for i := 1; i < len(path); i++ {
		trigger := composeTrigger(g.state.currentCharacter.ID, model.MOVE_TO, fmt.Sprintf("%d:%d", path[i-1].X, path[i-1].Y), fmt.Sprintf("%d:%d", path[i].X, path[i].Y), g.state.currentLocation.ID)
		g.state.watingActions = append(g.state.watingActions, trigger)
	}
	g.state.pathPointIndex = 0

	if len(g.state.watingActions) > 0 {
		g.SetCurrentState(model.EXECUTING_ACTION)
	}

}

func (g *Game) GetSpriteDimensions(frameImage []byte) (int, int) {

	spriteImage, _, err := image.Decode(bytes.NewReader(frameImage))
	if err != nil {
		log.Fatal(err)
	}

	img := ebiten.NewImageFromImage(spriteImage)

	return img.Bounds().Dx(), img.Bounds().Dy()

}
