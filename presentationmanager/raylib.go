package presentationmanager

import (
	"chemistry/sdk"

	"github.com/gen2brain/raylib-go/raylib"
)

type screenhandler struct {
}

func NewRayLibPresentationHandler() sdk.PresentationHandler {
	return screenhandler{}
}

func (s screenhandler) CreateWindow(width int32, height int32) {
	rl.InitWindow(width, height, "raylib [core] example - basic window")

	rl.SetTargetFPS(60)

	for !rl.WindowShouldClose() {
		rl.BeginDrawing()

		rl.ClearBackground(rl.RayWhite)

		rl.DrawText("Congrats! You created your first window!", 190, 200, 20, rl.LightGray)

		rl.EndDrawing()
	}

	rl.CloseWindow()
}
