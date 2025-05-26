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

//go:embed images/*
var folderData embed.FS

func InitCustomData(game *logic.Game) {

	game.AddFont("MonkeyIsland", CharactersFont)
	game.AddFont("MonkeyIslandOutline", CharactersOutlineFont)

	game.AddCursor("Cross", utils.ReadData(folderData, "images/cursors/cross.png"))

	mainChar := model.NewCharacter("Guybrush", model.Color{
		R: 255,
		G: 50,
		B: 50,
	})
	mainChar.Animations[string(model.IDLE_FACE_RIGHT)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/SLR.png"})
	mainChar.Animations[string(model.IDLE_FACE_LEFT)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/SRL.png"})
	mainChar.Animations[string(model.IDLE_FACE_UP)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/SBU.png"})
	mainChar.Animations[string(model.IDLE_FACE_DOWN)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/STD.png"})
	mainChar.Animations[string(model.WALK_LEFT_TO_RIGHT)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/WLR1.png", "images/characters/guybrush/WLR2.png", "images/characters/guybrush/WLR3.png", "images/characters/guybrush/WLR4.png", "images/characters/guybrush/WLR5.png", "images/characters/guybrush/WLR6.png"})
	mainChar.Animations[string(model.WALK_RIGHT_TO_LEFT)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/WRL1.png", "images/characters/guybrush/WRL2.png", "images/characters/guybrush/WRL3.png", "images/characters/guybrush/WRL4.png", "images/characters/guybrush/WRL5.png", "images/characters/guybrush/WRL6.png"})
	mainChar.Animations[string(model.WALK_DOWN_TO_UP)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/WBU1.png", "images/characters/guybrush/WBU2.png", "images/characters/guybrush/WBU3.png", "images/characters/guybrush/WBU4.png", "images/characters/guybrush/WBU5.png", "images/characters/guybrush/WBU6.png"})
	mainChar.Animations[string(model.WALK_UP_TO_DOWN)] = utils.ReadMultipleData(folderData, []string{"images/characters/guybrush/WTD1.png", "images/characters/guybrush/WTD2.png", "images/characters/guybrush/WTD3.png", "images/characters/guybrush/WTD4.png", "images/characters/guybrush/WTD5.png", "images/characters/guybrush/WTD6.png"})
	game.AddCharacter(mainChar)

	location1 := model.NewLocation("Stanza di test 1", utils.ReadData(folderData, "images/backgrounds/background1.jpeg"))
	location2 := model.NewLocation("Stanza di test 2", utils.ReadData(folderData, "images/backgrounds/background2.jpeg"))

	itemNote := model.NewItem("Note", false, true, utils.ReadData(folderData, "images/items/Note.png"))
	game.AddItem(itemNote)

	itemKey := model.NewItem("Key", true, true, utils.ReadData(folderData, "images/items/Key.png"))
	game.AddItem(itemKey)

	itemDoorToLocation2 := model.NewItem("Door to 2", false, false, utils.ReadData(folderData, "images/items/Note.png"))
	game.AddItem(itemDoorToLocation2)

	itemDoorToLocation1 := model.NewItem("Door to 1", false, false, utils.ReadData(folderData, "images/items/Note.png"))
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

		Polygons: [][]image.Point{
			{
				image.Pt(145, 250),
				image.Pt(246, 387),
				image.Pt(269, 413),
				image.Pt(491, 409),
				image.Pt(692, 311),
				image.Pt(854, 320),
				image.Pt(762, 420),
				image.Pt(814, 433),
				image.Pt(857, 403),
				image.Pt(970, 407),
				image.Pt(1008, 427),
				image.Pt(1350, 477),
				image.Pt(1516, 532),
				image.Pt(124, 534),
				image.Pt(140, 443),
				image.Pt(85, 255),
			},
		},

		//  (0,0) >---+   +-----------+ (50,0)
		//        | s |   |   >---+   |
		//        |   +---+   |   | d |
		//        |           +---+   |
		// (0,20) +-------------------+ (50,20)
		//
		// s = start, d = destination
		/*
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
		*/
	})

	location2.AddItem(itemDoorToLocation1.ID, model.ItemLocation{
		InteractionPoint: image.Point{},
		LocationPoint:    image.Point{},
	})

	game.AddLocation(location1)
	game.AddLocation(location2)

	//CUSTOM ACTIONS
	lookAt1 := model.NewAction(mainChar.ID, model.LOOK_AT, itemNote.ID, model.NOTHING, model.SOMEWHERE, "game:SaySomething(\"La nota dice: 'Usa la chiave sulla porta'\"); game:SaySomething(\"mmh ci potevo anche arrivare da solo...\")", model.DoNothing, model.DoNothing, model.DoNothing)
	game.AddAction(lookAt1)

	lookAt2 := model.NewAction(mainChar.ID, model.LOOK_AT, itemKey.ID, model.NOTHING, model.SOMEWHERE, "game:SaySomething(\"Sembra la chiave di una porta..\")", model.DoNothing, model.DoNothing, model.DoNothing)
	game.AddAction(lookAt2)

	game.SetFlag("door_open", false)
	moveTo1 := model.NewAction(mainChar.ID, model.MOVE_TO, itemDoorToLocation2.ID, model.NOTHING, model.SOMEWHERE, "if not game:GetFlag(\"door_open\") then game:SaySomething(\"La porta e' chiusa\") end", model.DoNothing, model.DoNothing, model.DoNothing)
	game.AddAction(moveTo1)

	useKeyOnDoor1 := model.NewAction(mainChar.ID, model.USE, itemKey.ID, itemDoorToLocation2.ID, model.SOMEWHERE, "if not game:GetFlag(\"door_open\") then game:SetFlag(\"door_open\", true); game:SaySomething(\"La porta si e' aperta!\") else game:SaySomething(\"La porta e' gia' aperta\") end", model.DoNothing, model.DoNothing, model.DoNothing)
	game.AddAction(useKeyOnDoor1)

	intro := func() {
		//TODO: Create one method to do all this stuff
		game.SetCurrentLocation(location1.ID)
		game.SetCurrentCharacter(mainChar.ID)
		game.SetCurrentCharacterPosition(image.Pt(180, 355))
		game.SetCurrentCharacterDirection(model.DOWN)
		game.SetCurrentCharacterAnimation(string(model.IDLE_FACE_DOWN))
		game.SetCurrentCharacterAnimationFrame(0)
		game.SetCurrentState(model.IDLE)
		game.SetCurrentCursor("Cross")
	}
	// game.AddScript("intro", intro) // This was for the old system
	intro() // Call the intro function directly now

}
