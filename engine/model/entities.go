package model

import (
	"bytes"
	"image"
	"log"

	"github.com/google/uuid"
)

var DoNothing = func() {}

type Verb string

const (
	LOOK_AT Verb = "look-at"
	PICK_UP Verb = "pick-up"
	USE     Verb = "use"
	TALK_TO Verb = "talk-to"
	GIVE_TO Verb = "give-to"
	MOVE_TO Verb = "move-to"
)

type Action struct {
	ActionFrom    string
	Verb          Verb
	ActionTo      string
	With          string
	Where         string
	ExecuteBefore func()
	ExecuteAction func()
	ExecuteAfter  func()
}

const (
	SOMEWHERE string = "everywhere"
	NOWHERE   string = "nowhere"
	SOMETHING string = "everything"
	SOMEONE   string = "everyone"
	NOTHING   string = "nothing"
)

type EntityType string

const (
	CHARACTER EntityType = "character"
	ITEM      EntityType = "item"
	LOCATION  EntityType = "location"
)

type AnimationTypes string

const (
	WALK_LEFT_TO_RIGHT AnimationTypes = "WALK-LEFT-TO-RIGHT"
	WALK_RIGHT_TO_LEFT AnimationTypes = "WALK-RIGHT-TO-LEFT"
	WALK_UP_TO_DOWN    AnimationTypes = "WALK-UP-TO-DOWN"
	WALK_DOWN_TO_UP    AnimationTypes = "WALK-DOWN-TO-UP"
	TALK_LEFT_TO_RIGHT AnimationTypes = "TALK-LEFT-TO-RIGHT"
	TALK_RIGHT_TO_LEFT AnimationTypes = "TALK-RIGHT-TO-LEFT"
	TALK_UP_TO_DOWN    AnimationTypes = "TALK-UP-TO-DOWN"
	TALK_DOWN_TO_UP    AnimationTypes = "TALK-DOWN-TO-UP"
	PICK_UP_FACE_LEFT  AnimationTypes = "PICK_UP_FACE_LEFT"
	PICK_UP_FACE_RIGHT AnimationTypes = "PICK_UP_FACE_RIGHT"
	PICK_UP_FACE_DOWN  AnimationTypes = "PICK_UP_FACE_DOWN"
	PICK_UP_FACE_UP    AnimationTypes = "PICK_UP_FACE_UP"
	IDLE_FACE_LEFT     AnimationTypes = "IDLE_FACE_LEFT"
	IDLE_FACE_RIGHT    AnimationTypes = "IDLE_FACE_RIGHT"
	IDLE_FACE_DOWN     AnimationTypes = "IDLE_FACE_DOWN"
	IDLE_FACE_UP       AnimationTypes = "IDLE_FACE_UP"
)

type StateType string

const (
	IDLE             StateType = "IDLE"
	WAITING_ACTION   StateType = "AWAITING_COMMAND"
	EXECUTING_ACTION StateType = "EXECUTING_ACTION"
)

type CharacterDirection string

const (
	LEFT  CharacterDirection = "LEFT"
	RIGHT CharacterDirection = "RIGHT"
	UP    CharacterDirection = "UP"
	DOWN  CharacterDirection = "DOWN"
)

type Entity struct {
	ID   string
	Type EntityType
	Name string
}

type Character struct {
	Entity
	TalkColor  Color
	Animations map[string][][]byte
	Inventory  map[string]InventorySlot
}

type Color struct {
	R uint8
	G uint8
	B uint8
}

type InventorySlot struct {
	Count int
	Item  Item
}

type Item struct {
	Entity
	Alpha          *image.Alpha
	Image          []byte
	InventoryImage []byte
	UseWith        bool
	Pickable       bool
}

type Layer struct {
	Image            []byte
	TransparentColor string
}

type WalkableArea struct {
	Polygons [][]image.Point
}

type Location struct {
	Entity
	scaleArea     Layer
	layers        []Layer
	walkableAreas []WalkableArea
	Items         map[string]ItemLocation
}

func (l *Location) AddItem(itemID string, itemLocation ItemLocation) {
	l.Items[itemID] = itemLocation
}

type ItemLocation struct {
	InteractionPoint image.Point
	LocationPoint    image.Point
}

func (l Location) GetWalkableArea(index int) WalkableArea {
	return l.walkableAreas[index]
}

func NewCharacter(name string, talkColor Color) Character {
	data := Character{
		Entity: Entity{
			ID:   uuid.New().String(),
			Type: CHARACTER,
			Name: name,
		},
		TalkColor:  talkColor,
		Animations: make(map[string][][]byte),
		Inventory:  make(map[string]InventorySlot),
	}
	return data
}

func NewLocation(name string) Location {
	data := Location{
		Entity: Entity{
			ID:   uuid.New().String(),
			Type: LOCATION,
			Name: name,
		},
		scaleArea:     Layer{},
		layers:        make([]Layer, 0),
		walkableAreas: make([]WalkableArea, 0),
		Items:         make(map[string]ItemLocation),
	}

	return data
}

func (l *Location) AddWalkableArea(area WalkableArea) {
	l.walkableAreas = append(l.walkableAreas, area)
}

func NewItem(name string, useWith bool, pickable bool, sprite []byte) Item {
	data := Item{
		Entity: Entity{
			ID:   uuid.New().String(),
			Type: ITEM,
			Name: name,
		},
		UseWith:  useWith,
		Pickable: pickable,
	}

	if len(sprite) != 0 {
		data.Image = sprite

		img, _, err := image.Decode(bytes.NewReader(data.Image))
		if err != nil {
			log.Fatal(err)
		}

		b := img.Bounds()
		ebitenAlphaImage := image.NewAlpha(b)
		for j := b.Min.Y; j < b.Max.Y; j++ {
			for i := b.Min.X; i < b.Max.X; i++ {
				ebitenAlphaImage.Set(i, j, img.At(i, j))
			}
		}

		data.Alpha = ebitenAlphaImage
	}

	return data
}

func NewAction(from string, verb Verb, to string, with string, where string, execBefore func(), execAction func(), execAfter func()) Action {
	data := Action{
		ActionFrom:    from,
		Verb:          verb,
		ActionTo:      to,
		With:          with,
		Where:         where,
		ExecuteBefore: execBefore,
		ExecuteAction: execAction,
		ExecuteAfter:  execAfter,
	}

	return data
}
