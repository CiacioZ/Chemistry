package main

import (
	"chemistry/engine/logic"
	"log"

	"github.com/hajimehoshi/ebiten/v2"
)

var game logic.Game

func init() {

	game = logic.NewGame()

	game.LoadGameData("demo_packaged.data")

	//data.InitGenericData(&game)
	//data.InitCustomData(&game)

	game.ExecuteScript("intro")
}

func main() {

	ebiten.SetFullscreen(true)
	ebiten.SetCursorMode(ebiten.CursorModeHidden)
	//ebiten.SetWindowSize(1920, 1080)
	if err := ebiten.RunGame(&game); err != nil {
		log.Fatal(err)
	}

}
