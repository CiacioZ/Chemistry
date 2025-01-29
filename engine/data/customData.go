package data

import (
	"chemistry/engine/logic"
	"chemistry/engine/model"
	"chemistry/engine/utils"
	"embed"
	"image"
)

var (
	//go:embed fonts/MonkeyIslandStandard.ttf
	CharactersFont []byte

	//go:embed fonts/MonkeyIslandOutline.ttf
	CharactersOutlineFont []byte
)

//go:embed images/*.*
var folderData embed.FS

func InitCustomData(game *logic.Game) {

	game.AddFont("MonkeyIsland", CharactersFont)
	game.AddFont("MonkeyIslandOutline", CharactersOutlineFont)

	mainChar := model.NewCharacter("Guybrush", model.Color{
		R: 255,
		G: 50,
		B: 50,
	})
	mainChar.Animations[string(model.IDLE_FACE_RIGHT)] = utils.ReadMultipleData(folderData, []string{"images/SLR.png"})
	mainChar.Animations[string(model.IDLE_FACE_LEFT)] = utils.ReadMultipleData(folderData, []string{"images/SRL.png"})
	mainChar.Animations[string(model.IDLE_FACE_UP)] = utils.ReadMultipleData(folderData, []string{"images/SBU.png"})
	mainChar.Animations[string(model.IDLE_FACE_DOWN)] = utils.ReadMultipleData(folderData, []string{"images/STD.png"})
	mainChar.Animations[string(model.WALK_LEFT_TO_RIGHT)] = utils.ReadMultipleData(folderData, []string{"images/WLR1.png", "images/WLR2.png", "images/WLR3.png", "images/WLR4.png", "images/WLR5.png", "images/WLR6.png"})
	mainChar.Animations[string(model.WALK_RIGHT_TO_LEFT)] = utils.ReadMultipleData(folderData, []string{"images/WRL1.png", "images/WRL2.png", "images/WRL3.png", "images/WRL4.png", "images/WRL5.png", "images/WRL6.png"})
	mainChar.Animations[string(model.WALK_DOWN_TO_UP)] = utils.ReadMultipleData(folderData, []string{"images/WBU1.png", "images/WBU2.png", "images/WBU3.png", "images/WBU4.png", "images/WBU5.png", "images/WBU6.png"})
	mainChar.Animations[string(model.WALK_UP_TO_DOWN)] = utils.ReadMultipleData(folderData, []string{"images/WTD1.png", "images/WTD2.png", "images/WTD3.png", "images/WTD4.png", "images/WTD5.png", "images/WTD6.png"})
	game.AddCharacter(mainChar)

	location1 := model.NewLocation("Stanza di test 1")
	location2 := model.NewLocation("Stanza di test 2")

	itemNote := model.NewItem("Note", false, true, utils.ReadData(folderData, "images/Note.png"))
	game.AddItem(itemNote)

	itemKey := model.NewItem("Key", true, true, utils.ReadData(folderData, "images/Key.png"))
	game.AddItem(itemKey)

	itemDoorToLocation2 := model.NewItem("Door to 2", false, false, utils.ReadData(folderData, "images/Note.png"))
	game.AddItem(itemDoorToLocation2)

	itemDoorToLocation1 := model.NewItem("Door to 1", false, false, utils.ReadData(folderData, "images/Note.png"))
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

	//CUSTOM ACTIONS
	lookAt1 := model.NewAction(mainChar.ID, model.LOOK_AT, itemNote.ID, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("La nota dice: 'Usa la chiave sulla porta'")
		game.SaySomething("mmh ci potevo anche arrivare da solo...")
	}, model.DoNothing)
	game.AddAction(lookAt1)

	lookAt2 := model.NewAction(mainChar.ID, model.LOOK_AT, itemKey.ID, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Sembra la chiave di una porta")
	}, model.DoNothing)
	game.AddAction(lookAt2)

	game.SetFlag("door_open", false)
	moveTo1 := model.NewAction(mainChar.ID, model.MOVE_TO, itemDoorToLocation2.ID, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		if !game.GetFlag("door_open") {
			game.SaySomething("La porta è chiusa")
		}
	}, model.DoNothing)
	game.AddAction(moveTo1)

	useKeyOnDoor1 := model.NewAction(mainChar.ID, model.USE, itemKey.ID, itemDoorToLocation2.ID, model.SOMEWHERE, model.DoNothing, func() {
		if !game.GetFlag("door_open") {
			game.SetFlag("door_open", true)
			game.SaySomething("La porta si è aperta!")
		} else {
			game.SaySomething("La porta è già aperta")
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

}
