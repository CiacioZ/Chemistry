package main

import (
	"chemistry/engine/data"
	"chemistry/engine/logic"
	"log"

	"github.com/hajimehoshi/ebiten/v2"
)

var game logic.Game

func init() {

	game = logic.NewGame()

	data.InitGenericData(&game)
	data.InitCustomData(&game)

	game.ExecuteScript("intro")
}

func main() {

	ebiten.SetFullscreen(true)
	//ebiten.SetWindowSize(1920, 1080)
	//ebiten.SetWindowTitle("Modulo Base")
	if err := ebiten.RunGame(&game); err != nil {
		log.Fatal(err)
	}

}
