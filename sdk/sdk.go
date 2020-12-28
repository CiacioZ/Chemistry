package sdk

import (
	"fmt"
)

func NewGame(resourcehandler ResourceHandler, gamelogichandler GameLogicHandler, presentationhandler PresentationHandler) game {
	game := game{
		resourcemanager:     resourcehandler,
		gamelogicmanager:    gamelogichandler,
		presentationmanager: presentationhandler,
	}

	return game
}

func (g game) Start() {
	fmt.Println("Game Start")
	g.presentationmanager.CreateWindow(800, 600)
}

func (g game) Stop() {
	fmt.Println("Game Stop")
}

func (g game) Save() {
	fmt.Println("Game Saved")
}
