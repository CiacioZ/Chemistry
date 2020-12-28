package main

import (
	"chemistry/assetmanager"
	"chemistry/presentationmanager"
	"chemistry/sdk"
	"time"
)

func main() {

	// assettmanager
	assetmanager := assetmanager.NewGobFileDataHandler(assetmanager.DefaultGobIndexFilename, assetmanager.DefaultGobDataFilename)

	// presentation manager
	presentationmanager := presentationmanager.NewRayLibPresentationHandler()

	// gamelogic manager
	// ... initialize gamelogic manager

	game := sdk.NewGame(assetmanager, nil, presentationmanager)

	game.Start()

	time.Sleep(2 * time.Second)

	game.Stop()
}
