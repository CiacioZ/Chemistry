package logic

import (
	"bytes"
	"chemistry/engine/model"
	"fmt"
	"image"
	"log"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"golang.org/x/image/math/f64"
)

const (
	screenWidth  = 960
	screenHeight = 540
)

type Camera struct {
	ViewPort   f64.Vec2
	Position   f64.Vec2
	ZoomFactor int
	Rotation   int
}

func (c *Camera) String() string {
	return fmt.Sprintf(
		"T: %.1f, R: %d, S: %d",
		c.Position, c.Rotation, c.ZoomFactor,
	)
}

func (c *Camera) viewportCenter() f64.Vec2 {
	return f64.Vec2{
		c.ViewPort[0] * 0.5,
		c.ViewPort[1] * 0.5,
	}
}

func (c *Camera) worldMatrix() ebiten.GeoM {
	m := ebiten.GeoM{}
	m.Translate(-c.Position[0], -c.Position[1])
	// We want to scale and rotate around center of image / screen
	m.Translate(-c.viewportCenter()[0], -c.viewportCenter()[1])
	m.Scale(
		math.Pow(1.01, float64(c.ZoomFactor)),
		math.Pow(1.01, float64(c.ZoomFactor)),
	)
	m.Rotate(float64(c.Rotation) * 2 * math.Pi / 360)
	m.Translate(c.viewportCenter()[0], c.viewportCenter()[1])
	return m
}

func (c *Camera) Render(world, screen *ebiten.Image) {
	screen.DrawImage(world, &ebiten.DrawImageOptions{
		GeoM: c.worldMatrix(),
	})
}

func (c *Camera) ScreenToWorld(posX, posY int) (float64, float64) {
	inverseMatrix := c.worldMatrix()
	if inverseMatrix.IsInvertible() {
		inverseMatrix.Invert()
		return inverseMatrix.Apply(float64(posX), float64(posY))
	} else {
		// When scaling it can happened that matrix is not invertable
		return math.NaN(), math.NaN()
	}
}

type GameData struct {
	Verbs     []model.Verb
	Locations map[string]model.Location  `json:"locations"`
	Items     map[string]model.Item      `json:"items"`
	Character map[string]model.Character `json:"character"`
	Triggers  map[string]model.Action    `json:"triggers"`
	Scripts   map[string]string
	Fonts     map[string][]byte
	Cursors   map[string][]byte
}

type GameState struct {
	flags                          map[string]bool
	counters                       map[string]int
	currentLocation                model.Location
	currentCharacter               model.Character
	pathFinder                     *model.Pathfinder
	pathPointIndex                 int
	currentCharacterPosition       image.Point
	currentCharacterDirection      model.CharacterDirection
	currentCharacterAnimation      string
	currentCharacterAnimationFrame int
	currentVerb                    model.Verb
	mainItemID                     string
	secondItemID                   string
	currentState                   model.StateType
	watingActions                  []string
	lastUpdated                    time.Time
	yOrderedEntities               []string
	cursorOnItem                   string
	textToDraw                     []string
	textDrawn                      time.Time
	world                          *ebiten.Image
	currentBackGround              *ebiten.Image
	currentCursor                  *ebiten.Image
	camera                         Camera
}

func (gs *GameState) CalculateYOrderedEntities() {
	type oderedItem struct {
		Id string
		Y  int
	}

	orderedItems := make([]oderedItem, 0)
	for id, position := range gs.currentLocation.Items {
		orderedItems = append(orderedItems, oderedItem{
			Id: id,
			Y:  position.LocationPoint.Y,
		})
	}

	orderedItems = append(orderedItems, oderedItem{
		Id: gs.currentCharacter.ID,
		Y:  gs.currentCharacterPosition.Y,
	})

	sort.Slice(orderedItems, func(i, j int) bool {
		return orderedItems[i].Y < orderedItems[j].Y
	})

	result := make([]string, 0)
	for _, item := range orderedItems {
		result = append(result, item.Id)
	}

	gs.yOrderedEntities = result
}

func (g *Game) GetCurrentState() model.StateType {
	return g.state.currentState
}

func (g *Game) SetCurrentState(state model.StateType) {
	g.state.currentState = state
}

func (g *Game) GetCurrentVerb() model.Verb {
	return g.state.currentVerb
}

func (g *Game) SetCurrentVerb(verb model.Verb) {
	g.state.currentVerb = verb
}

func (g *Game) SetCurrentCursor(name string) {

	cursorImage, _, err := image.Decode(bytes.NewReader(g.data.Cursors[name]))
	if err != nil {
		log.Fatal(err)
	}

	g.state.currentCursor = ebiten.NewImageFromImage(cursorImage)

}

func (g *Game) GetCurrentLocation() model.Location {
	return g.state.currentLocation
}

func (g *Game) SetCurrentLocation(location string) {
	locationData := g.GetLocation(location)
	g.state.currentLocation = locationData
	g.state.pathFinder = model.NewPathfinder(locationData.GetWalkableArea(0).Polygons)

	backgroundImage, _, err := image.Decode(bytes.NewReader(locationData.GetLayers()[0].Image))
	if err != nil {
		log.Fatal(err)
	}

	g.state.currentBackGround = ebiten.NewImageFromImage(backgroundImage)
	g.state.world = ebiten.NewImage(g.state.currentBackGround.Bounds().Dx(), g.state.currentBackGround.Bounds().Dx())
}

func (g *Game) GetCurrentCharacter() model.Character {
	return g.state.currentCharacter
}

func (g *Game) SetCurrentCharacter(character string) {
	characterData := g.GetCharacter(character)
	g.state.currentCharacter = characterData
}

func (g *Game) GetFlag(flag string) bool {
	return g.state.flags[flag]
}

func (g *Game) SetFlag(flag string, value bool) {
	g.state.flags[flag] = value
}

func (g *Game) GetCounter(counter string) int {
	return g.state.counters[counter]
}

func (g *Game) SetCounter(counter string, value int) {
	g.state.counters[counter] = value
}

func (g *Game) IncreaseCounter(counter string, value int) {
	g.state.counters[counter] += value
}

func (g *Game) GetLocation(id string) model.Location {
	return g.data.Locations[id]
}

func (g *Game) GetCharacter(id string) model.Character {
	return g.data.Character[id]
}

func (g *Game) GetItem(id string) model.Item {
	return g.data.Items[id]
}

func (g *Game) AddScript(name string, scriptText string) {
	if g.data.Scripts == nil {
		g.data.Scripts = make(map[string]string)
	}
	g.data.Scripts[name] = scriptText
}

func (g *Game) ExecuteScript(name string) {
	scriptText, exists := g.data.Scripts[name]
	if !exists {
		log.Printf("Error: Lua script named '%s' not found.", name)
		return
	}

	L := NewLuaState(g)
	defer L.Close()

	err := RunScript(L, scriptText)
	if err != nil {
		log.Printf("Error executing named Lua script '%s': %v", name, err)
	}
}

func (g *Game) GetCurrentCharacterPosition() image.Point {
	return g.state.currentCharacterPosition
}

func (g *Game) SetCurrentCharacterPosition(position image.Point) {
	g.state.currentCharacterPosition = position
}

func (g *Game) GetCurrentCharacterDirection() model.CharacterDirection {
	return g.state.currentCharacterDirection
}

func (g *Game) SetCurrentCharacterDirection(direction model.CharacterDirection) {
	g.state.currentCharacterDirection = direction
}

func (g *Game) SetCurrentCharacterAnimationFrame(value int) {
	g.state.currentCharacterAnimationFrame = value
}

func (g *Game) SetCurrentCharacterAnimation(animation string) {
	g.state.currentCharacterAnimation = animation
}

func (g *Game) SetCurrentCharacterAnimationAtFrame(animation string, frame int) {
	g.state.currentCharacterAnimation = animation
	g.state.currentCharacterAnimationFrame = frame
}

func (g *Game) AdvanceCurrentAnimationFrame() {
	g.state.currentCharacterAnimationFrame += 1
	if g.state.currentCharacterAnimationFrame >= len(g.state.currentCharacter.Animations[g.state.currentCharacterAnimation]) {
		g.state.currentCharacterAnimationFrame = 0
	}
}

func (g *Game) GetCurrentCharacterAnimation() (string, int) {
	return g.state.currentCharacterAnimation, g.state.currentCharacterAnimationFrame
}

func (g *Game) SaySomething(sentence string) {
	g.state.textToDraw = append(g.state.textToDraw, sentence)
}

func initGameData() GameData {
	return GameData{
		Verbs: []model.Verb{
			model.MOVE_TO,
			model.LOOK_AT,
			model.PICK_UP,
			model.USE,
			model.TALK_TO,
			model.GIVE_TO,
		},
		Items:     make(map[string]model.Item),
		Locations: make(map[string]model.Location),
		Character: make(map[string]model.Character),
		Triggers:  make(map[string]model.Action),
		Scripts:   make(map[string]string),
		Fonts:     make(map[string][]byte),
		Cursors:   make(map[string][]byte),
	}
}

func initGameState() GameState {
	return GameState{
		flags:                          make(map[string]bool),
		counters:                       make(map[string]int),
		currentLocation:                model.Location{},
		currentCharacter:               model.Character{},
		pathFinder:                     nil,
		currentCharacterPosition:       image.Point{},
		currentCharacterDirection:      "",
		currentCharacterAnimation:      "",
		currentCharacterAnimationFrame: 0,
		currentVerb:                    model.MOVE_TO,
		mainItemID:                     "",
		secondItemID:                   "",
		currentState:                   model.IDLE,
		watingActions:                  make([]string, 0),
		lastUpdated:                    time.Time{},
		yOrderedEntities:               make([]string, 0),
		cursorOnItem:                   "",
		textToDraw:                     make([]string, 0),
		textDrawn:                      time.Time{},
		world:                          nil,
		currentBackGround:              nil,
		currentCursor:                  nil,
		camera:                         Camera{ViewPort: f64.Vec2{screenWidth, screenHeight}},
	}
}

func composeTrigger(from string, verb model.Verb, to, with, where string) string {
	return fmt.Sprintf("%s.%s.%s.%s.%s", from, verb, to, with, where)
}

func calculateActionTrigger(action model.Action) string {
	trigger := composeTrigger(action.ActionFrom, action.Verb, action.ActionTo, action.With, action.Where)

	return trigger
}

func (g *Game) AddFont(name string, font []byte) {
	g.data.Fonts[name] = font
}

func (g *Game) AddCursor(name string, cursor []byte) {
	g.data.Cursors[name] = cursor
}

func (g *Game) AddCharacter(character model.Character) {
	g.data.Character[character.Name] = character
}

func (g *Game) AddItem(item model.Item) {
	g.data.Items[item.ID] = item
}

func (g *Game) AddLocation(location model.Location) {
	g.data.Locations[location.Name] = location
}

func (g *Game) AddAction(action model.Action) {
	trigger := calculateActionTrigger(action)
	g.data.Triggers[trigger] = action
}

func (g *Game) ExecuteAction(inputTrigger string) {

	if inputTrigger == "" {
		return
	}

	triggerParts := strings.Split(inputTrigger, ".")

	subject := triggerParts[0]
	verb := model.Verb(triggerParts[1])
	mainObject := triggerParts[2]
	secondObject := triggerParts[3]
	location := triggerParts[4]

	actionToExecute := g.getActionToExecute(subject, verb, mainObject, secondObject, location)

	log.Printf("Executing Lua script for action %s: %v", inputTrigger, actionToExecute.Script)

	L := NewLuaState(g)
	defer L.Close()

	err := RunScript(L, actionToExecute.Script)
	if err != nil {
		log.Printf("Error executing Lua script for action %s: %v", inputTrigger, err)
	}

	switch actionToExecute.Verb {
	case model.GIVE_TO:
		item := g.data.Items[mainObject]
		character := g.data.Character[subject]
		if character.Inventory[item.ID].Count == 1 {
			delete(character.Inventory, item.ID)
		} else {
			slot := character.Inventory[item.ID]
			slot.Count--
			character.Inventory[item.ID] = slot
		}

	case model.TALK_TO:
		// TODO: Implement talk to
	case model.PICK_UP:
		item := g.data.Items[mainObject]
		if item.Pickable {
			characterData := g.data.Character[subject]
			if slot, exists := characterData.Inventory[item.ID]; exists {
				slot.Count++
				characterData.Inventory[item.ID] = slot
			} else {
				characterData.Inventory[item.ID] = model.InventorySlot{
					Count: 1,
					Item:  item,
				}
			}
			locationData := g.data.Locations[location]
			delete(locationData.Items, item.ID)

		} else {
			g.SaySomething("I can't pick that up.")
		}
	case model.USE:
		//TODO: Implement use
	case model.MOVE_TO:
		//TODO: Implement move to
	case model.LOOK_AT:
		//TODO: Implement look at
	default:
		log.Printf("Invalid verb '%s' for non-scripted action", verb)
	}

}

func (g *Game) getActionToExecute(subject string, verb model.Verb, mainObject string, secondObject string, location string) model.Action {
	inputTrigger := composeTrigger(subject, verb, mainObject, secondObject, location)

	if action, exists := g.data.Triggers[inputTrigger]; exists {
		return action
	}

	inputTrigger = composeTrigger(subject, verb, mainObject, secondObject, model.SOMEWHERE)
	if action, exists := g.data.Triggers[inputTrigger]; exists {
		return action
	}

	switch secondObject {
	case model.SOMETHING:
		inputTrigger = composeTrigger(subject, verb, mainObject, model.SOMETHING, model.SOMEWHERE)
		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}

		inputTrigger = composeTrigger(subject, verb, model.SOMETHING, model.SOMETHING, model.SOMEWHERE)

		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}

		inputTrigger = composeTrigger(model.SOMEONE, verb, model.SOMETHING, model.SOMETHING, model.SOMEWHERE)

		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}
	case model.NOTHING:
		inputTrigger = composeTrigger(subject, verb, mainObject, model.NOTHING, model.SOMEWHERE)

		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}

		inputTrigger = composeTrigger(subject, verb, model.SOMETHING, model.NOTHING, model.SOMEWHERE)

		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}

		inputTrigger = composeTrigger(model.SOMEONE, verb, model.SOMETHING, model.NOTHING, model.SOMEWHERE)

		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}

		inputTrigger = composeTrigger(model.SOMEONE, verb, mainObject, model.NOTHING, model.SOMEWHERE)

		if action, exists := g.data.Triggers[inputTrigger]; exists {
			return action
		}
	}

	return model.NewAction(subject, verb, mainObject, secondObject, location, "", model.DoNothing, model.DoNothing, model.DoNothing)
}
