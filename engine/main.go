package main

import (
	"chemistry/engine/logic"
	"chemistry/engine/model"
	"chemistry/engine/utils"
	"fmt"
	"image"
	"log"

	"github.com/hajimehoshi/ebiten/v2"
)

var game logic.Game

func init() {

	game = logic.NewGame()

	mainChar := model.NewCharacter("Guybrush", "")
	mainChar.Animations[string(model.IDLE_FACE_RIGHT)] = utils.ReadMultipleData([]string{"./data/SLR.png"})
	mainChar.Animations[string(model.IDLE_FACE_LEFT)] = utils.ReadMultipleData([]string{"./data/SRL.png"})
	mainChar.Animations[string(model.IDLE_FACE_UP)] = utils.ReadMultipleData([]string{"./data/SBU.png"})
	mainChar.Animations[string(model.IDLE_FACE_DOWN)] = utils.ReadMultipleData([]string{"./data/STD.png"})
	mainChar.Animations[string(model.WALK_LEFT_TO_RIGHT)] = utils.ReadMultipleData([]string{"./data/WLR1.png", "./data/WLR2.png", "./data/WLR3.png", "./data/WLR4.png", "./data/WLR5.png", "./data/WLR6.png"})
	mainChar.Animations[string(model.WALK_RIGHT_TO_LEFT)] = utils.ReadMultipleData([]string{"./data/WRL1.png", "./data/WRL2.png", "./data/WRL3.png", "./data/WRL4.png", "./data/WRL5.png", "./data/WRL6.png"})
	mainChar.Animations[string(model.WALK_DOWN_TO_UP)] = utils.ReadMultipleData([]string{"./data/WBU1.png", "./data/WBU2.png", "./data/WBU3.png", "./data/WBU4.png", "./data/WBU5.png", "./data/WBU6.png"})
	mainChar.Animations[string(model.WALK_UP_TO_DOWN)] = utils.ReadMultipleData([]string{"./data/WTD1.png", "./data/WTD2.png", "./data/WTD3.png", "./data/WTD4.png", "./data/WTD5.png", "./data/WTD6.png"})
	game.AddCharacter(mainChar)

	location1 := model.NewLocation("Stanza di test 1")
	location2 := model.NewLocation("Stanza di test 2")

	itemNote := model.NewItem("Note", false, true, "./data/Note.png")
	game.AddItem(itemNote)

	itemKey := model.NewItem("Key", true, true, "./data/Key.png")
	game.AddItem(itemKey)

	itemDoorToLocation2 := model.NewItem("Door to 2", false, false, "./data/Note.png")
	game.AddItem(itemDoorToLocation2)

	itemDoorToLocation1 := model.NewItem("Door to 1", false, false, "./data/Note.png")
	game.AddItem(itemDoorToLocation1)

	location1.AddItem(itemNote.ID, model.ItemLocation{
		InteractionPoint: image.Point{
			X: 40,
			Y: 120,
		},
		LocationPoint: image.Point{
			X: 30,
			Y: 100,
		},
	})
	location1.AddItem(itemKey.ID, model.ItemLocation{
		InteractionPoint: image.Point{
			X: 75,
			Y: 125,
		},
		LocationPoint: image.Point{
			X: 80,
			Y: 130,
		},
	})
	location1.AddItem(itemDoorToLocation2.ID, model.ItemLocation{
		InteractionPoint: image.Point{
			X: 135,
			Y: 82,
		},
		LocationPoint: image.Point{
			X: 125,
			Y: 65,
		},
	})
	location1.AddWalkableArea(model.WalkableArea{
		//  (0,0) >---+   +-----------+ (50,0)
		//        | s |   |   >---+   |
		//        |   +---+   |   | d |
		//        |           +---+   |
		// (0,20) +-------------------+ (50,20)
		//
		// s = start, d = destination
		Polygons: [][]image.Point{
			// Outer shape
			{
				image.Pt(10, 80),
				image.Pt(110, 80),
				image.Pt(110, 140),
				image.Pt(120, 140),
				image.Pt(120, 80),
				image.Pt(150, 80),
				image.Pt(150, 150),
				image.Pt(10, 150),
			},
			// Inner rectangle ("hole")
			{
				image.Pt(130, 85),
				image.Pt(140, 85),
				image.Pt(140, 145),
				image.Pt(130, 145),
			},
		},
	})

	location2.AddItem(itemDoorToLocation1.ID, model.ItemLocation{
		InteractionPoint: image.Point{},
		LocationPoint:    image.Point{},
	})

	game.AddLocation(location1)
	game.AddLocation(location2)

	// GENERIC ACTIONS
	genericMoveTo := model.NewAction(model.SOMEONE, model.MOVE_TO, model.SOMEWHERE, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Vado di là")
	}, model.DoNothing)
	game.AddAction(genericMoveTo)

	genericLookAt := model.NewAction(model.SOMEONE, model.LOOK_AT, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Niente di particolare")
	}, model.DoNothing)
	game.AddAction(genericLookAt)

	genericGiveTo := model.NewAction(model.SOMEONE, model.GIVE_TO, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Non credo che lo voglia")
	}, model.DoNothing)
	game.AddAction(genericGiveTo)

	genericTalkTo := model.NewAction(model.SOMEONE, model.TALK_TO, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Non credo che abbia qualcosa da dire")
	}, model.DoNothing)
	game.AddAction(genericTalkTo)

	genericUse := model.NewAction(model.SOMEONE, model.USE, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Non credo che possa funzionare")
	}, model.DoNothing)
	game.AddAction(genericUse)

	genericUseWith := model.NewAction(model.SOMEONE, model.USE, model.SOMETHING, model.SOMETHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Non credo che possano funzionare insieme")
	}, model.DoNothing)
	game.AddAction(genericUseWith)

	genericPickUp := model.NewAction(model.SOMEONE, model.PICK_UP, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Credo che lo prenderò")
	}, model.DoNothing)
	game.AddAction(genericPickUp)

	//CUSTOM ACTIONS
	lookAt1 := model.NewAction(mainChar.ID, model.LOOK_AT, itemNote.ID, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("La nota dice: 'Usa la chiave sulla porta'")
	}, model.DoNothing)
	game.AddAction(lookAt1)

	lookAt2 := model.NewAction(mainChar.ID, model.LOOK_AT, itemKey.ID, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		fmt.Println("Sembra la chiave di una porta")
	}, model.DoNothing)
	game.AddAction(lookAt2)

	game.SetFlag("door_open", false)
	moveTo1 := model.NewAction(mainChar.ID, model.MOVE_TO, itemDoorToLocation2.ID, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		if !game.GetFlag("door_open") {
			fmt.Println("La porta è chiusa")
		}
	}, model.DoNothing)
	game.AddAction(moveTo1)

	useKeyOnDoor1 := model.NewAction(mainChar.ID, model.USE, itemKey.ID, itemDoorToLocation2.ID, model.SOMEWHERE, model.DoNothing, func() {
		if !game.GetFlag("door_open") {
			game.SetFlag("door_open", true)
			fmt.Println("La porta si è aperta!")
		} else {
			fmt.Println("La porta è già aperta")
		}
	}, model.DoNothing)
	game.AddAction(useKeyOnDoor1)

	intro := func() {
		//TODO: Create one method to do all this stuff
		game.SetCurrentLocation(location1.ID)
		game.SetCurrentCharacter(mainChar.ID)
		game.SetCurrentCharacterPosition(image.Pt(80, 105))
		game.SetCurrentCharacterDirection(model.DOWN)
		game.SetCurrentCharacterAnimation(string(model.IDLE_FACE_DOWN))
		game.SetCurrentCharacterAnimationFrame(0)
		game.SetCurrentState(model.IDLE)
	}
	game.AddScript("intro", intro)

	game.ExecuteScript("intro")
}

func main() {

	ebiten.SetWindowSize(1920, 1080)
	ebiten.SetWindowTitle("Modulo Base")
	if err := ebiten.RunGame(&game); err != nil {
		log.Fatal(err)
	}

}
