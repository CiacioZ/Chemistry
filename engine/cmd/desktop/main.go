package main

import (
	"chemistry/engine/logic"
	"fmt"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"os"

	"github.com/hajimehoshi/ebiten/v2"
)

var game logic.Game

func init() {

	game = logic.NewGame()

	err := game.LoadGameData("demo2_packaged.data")
	if err != nil {
		fmt.Println(fmt.Sprintf("Error LoadGameData: %s", err.Error()))
		os.Exit(1)
	}

	//data.InitGenericData(&game)
	//data.InitCustomData(&game)

	game.ExecuteScript("Intro")
}

func main() {

	ebiten.SetFullscreen(true)
	ebiten.SetCursorMode(ebiten.CursorModeHidden)
	//ebiten.SetWindowSize(1920, 1080)
	if err := ebiten.RunGame(&game); err != nil {
		log.Fatal(err)
	}

}
