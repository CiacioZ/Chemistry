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

	defer g.state.CalculateYOrderedEntities()

	switch g.GetCurrentState() {
	case model.EXECUTING_ACTION:

		if len(g.state.watingActions) == 0 {
			g.SetCurrentState(model.IDLE)
			return nil
		}

		triggerAction := g.state.watingActions[0]
		triggerActionParts := strings.Split(triggerAction, ".")
		currentActionVerb := model.Verb(triggerActionParts[1])
		switch currentActionVerb {
		case model.MOVE_TO:

			if triggerActionParts[3] == model.NOTHING {
				g.ExecuteAction(g.state.watingActions[0])
				if len(g.state.watingActions) > 1 {
					g.state.watingActions = g.state.watingActions[1:]
					return nil
				} else {
					g.SetCurrentState(model.IDLE)
					g.state.watingActions = make([]string, 0)
				}
				return nil
			}

			start := triggerActionParts[2]
			startParts := strings.Split(start, ":")
			startX, _ := strconv.Atoi(startParts[0])
			startY, _ := strconv.Atoi(startParts[1])

			destination := triggerActionParts[3]
			destinationParts := strings.Split(destination, ":")
			destinationX, _ := strconv.Atoi(destinationParts[0])
			destinationY, _ := strconv.Atoi(destinationParts[1])
			position := g.GetCurrentCharacterPosition()

			if position.X == destinationX && position.Y == destinationY {
				if len(g.state.watingActions) > 1 {

					triggeParts := strings.Split(g.state.watingActions[1], ".")
					if triggeParts[1] == string(model.MOVE_TO) && triggeParts[3] != model.NOTHING {
						g.state.pathPointIndex = 0
						g.state.watingActions = g.state.watingActions[1:]
					} else {
						g.state.watingActions = g.state.watingActions[1:]

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

						return nil
					}

				} else {
					g.SetCurrentState(model.IDLE)
					g.state.watingActions = make([]string, 0)

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

					return nil
				}
			} else {

				if g.state.pathPointIndex == 0 {
					angle := math.Atan2(float64(destinationY-startY), float64(destinationX-startX)) * 180 / math.Pi

					switch {
					case angle >= -45 && angle <= 45:
						if g.GetCurrentCharacterDirection() != model.RIGHT {
							g.SetCurrentCharacterDirection(model.RIGHT)
							g.SetCurrentCharacterAnimationFrame(0)
						}

						g.SetCurrentCharacterAnimation(string(model.WALK_LEFT_TO_RIGHT))

					case angle > 45 && angle < 135:
						if g.GetCurrentCharacterDirection() != model.DOWN {
							g.SetCurrentCharacterDirection(model.DOWN)
							g.SetCurrentCharacterAnimationFrame(0)
						}

						g.SetCurrentCharacterAnimation(string(model.WALK_UP_TO_DOWN))

					case angle >= 135 || angle <= -135:
						if g.GetCurrentCharacterDirection() != model.LEFT {
							g.SetCurrentCharacterDirection(model.LEFT)
							g.SetCurrentCharacterAnimationFrame(0)
						}

						g.SetCurrentCharacterAnimation(string(model.WALK_RIGHT_TO_LEFT))

					case angle > -135 && angle < -45:
						if g.GetCurrentCharacterDirection() != model.UP {
							g.SetCurrentCharacterDirection(model.UP)
							g.SetCurrentCharacterAnimationFrame(0)
						}

						g.SetCurrentCharacterAnimation(string(model.WALK_DOWN_TO_UP))

					}
				}

				elapsed := time.Since(g.state.lastUpdated).Milliseconds()
				if elapsed >= 96 {
					g.state.lastUpdated = time.Now()
					g.AdvanceCurrentAnimationFrame()
				}

				points := model.CalculateLine(startX, startY, destinationX, destinationY)
				if len(points) > 0 {
					point := points[g.state.pathPointIndex]

					g.SetCurrentCharacterPosition(point)
					g.state.pathPointIndex += 2

					if g.state.pathPointIndex >= len(points) {
						g.state.pathPointIndex = len(points) - 1
					}

				}
			}

		default:
			g.ExecuteAction(g.state.watingActions[0])
			if len(g.state.watingActions) > 1 {
				g.state.watingActions = g.state.watingActions[1:]
				return nil
			} else {
				g.SetCurrentState(model.IDLE)
				g.state.watingActions = make([]string, 0)
			}
		}
	}

	g.state.cursorOnItem = g.itemAt(ebiten.CursorPosition())

	switch {
	case inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft):

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
					g.moveTo(location.Items[item.ID].InteractionPoint.X, location.Items[item.ID].InteractionPoint.Y)

					g.state.watingActions = append(g.state.watingActions, trigger)

					return nil
				}
			}

			switch g.GetCurrentVerb() {
			case model.MOVE_TO:
				x, y := ebiten.CursorPosition()

				g.moveTo(x, y)
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
				return nil
			}

		case model.EXECUTING_ACTION:

			switch g.GetCurrentVerb() {
			case model.MOVE_TO:
				x, y := ebiten.CursorPosition()
				g.moveTo(x, y)
			}

		}
	case inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonRight):
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
	case ebiten.IsKeyPressed(ebiten.KeyEscape):
		return ebiten.Termination
	}

	return nil
}

func (g *Game) Draw(screen *ebiten.Image) {

	// Disegna lo sfondo della location corrente (se presente)
	g.drawBackground(screen, g.GetCurrentLocation())

	currentCharacter := g.GetCurrentCharacter()

	// Disegna tutte le entità nell'ordine calcolato
	for _, entityID := range g.state.yOrderedEntities {
		if entityID == currentCharacter.ID {
			// Disegna il personaggio del giocatore
			g.drawCharacter(screen, currentCharacter)
		} else {
			// Disegna l'oggetto
			item := g.data.Items[entityID]
			itemLocation := g.GetCurrentLocation().Items[entityID]
			g.drawItem(screen, item, itemLocation)
		}
	}

	// Scrive eventuali code che il personaggio deve dire
	g.DrawText(screen, currentCharacter)

	// Disegna l'interfaccia utente e le informazioni di debug
	g.drawUI(screen)
}

func (g *Game) DrawText(screen *ebiten.Image, currentCharacter model.Character) {

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

		_, height := g.GetSpriteDimensions(characterFrameImage)

		opRegular := &text.DrawOptions{}
		opRegular.GeoM.Translate(float64(g.state.currentCharacterPosition.X), float64(g.state.currentCharacterPosition.Y-height-20))
		//opRegular.LineSpacing = 30
		opRegular.ColorScale.ScaleWithColor(talkColor)
		opRegular.PrimaryAlign = text.AlignCenter
		opRegular.SecondaryAlign = text.AlignStart
		text.Draw(screen, g.state.textToDraw[0], &text.GoTextFace{
			Source: fontFaceSource,
			Size:   12,
		}, opRegular)

		opOutline := &text.DrawOptions{}
		opOutline.GeoM.Translate(float64(g.state.currentCharacterPosition.X), float64(g.state.currentCharacterPosition.Y-height-20))
		//opOutline.LineSpacing = 30
		opOutline.ColorScale.ScaleWithColor(color.Black)
		opOutline.PrimaryAlign = text.AlignCenter
		opOutline.SecondaryAlign = text.AlignStart
		text.Draw(screen, g.state.textToDraw[0], &text.GoTextFace{
			Source: fontFaceOutlineSource,
			Size:   12,
		}, opOutline)
	}

}

func (g *Game) drawBackground(screen *ebiten.Image, location model.Location) {

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(0, 0)

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
		X: img.Bounds().Dx() / 2,
		Y: img.Bounds().Dy(),
	}
	op := &ebiten.DrawImageOptions{}
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

func (g *Game) itemAt(x int, y int) string {
	for id, location := range g.state.currentLocation.Items {

		alphaImage := g.GetItem(id).Alpha

		if alphaImage.At(x-location.LocationPoint.X, y-location.LocationPoint.Y).(color.Alpha).A > 0 {
			return id
		}
	}

	return ""
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (screenWidth, screenHeight int) {
	return 960, 540
}

func (g *Game) moveTo(x int, y int) {
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
