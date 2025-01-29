package data

import (
	"chemistry/engine/logic"
	"chemistry/engine/model"
)

func InitGenericData(game *logic.Game) {

	// GENERIC ACTIONS
	genericMoveTo := model.NewAction(model.SOMEONE, model.MOVE_TO, model.SOMEWHERE, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Vado di là")
	}, model.DoNothing)
	game.AddAction(genericMoveTo)

	genericLookAt := model.NewAction(model.SOMEONE, model.LOOK_AT, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Niente di particolare")
	}, model.DoNothing)
	game.AddAction(genericLookAt)

	genericGiveTo := model.NewAction(model.SOMEONE, model.GIVE_TO, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Non credo che lo voglia")
	}, model.DoNothing)
	game.AddAction(genericGiveTo)

	genericTalkTo := model.NewAction(model.SOMEONE, model.TALK_TO, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Non credo che abbia qualcosa da dire")
	}, model.DoNothing)
	game.AddAction(genericTalkTo)

	genericUse := model.NewAction(model.SOMEONE, model.USE, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Non credo che possa funzionare")
	}, model.DoNothing)
	game.AddAction(genericUse)

	genericUseWith := model.NewAction(model.SOMEONE, model.USE, model.SOMETHING, model.SOMETHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Non credo che possano funzionare insieme")
	}, model.DoNothing)
	game.AddAction(genericUseWith)

	genericPickUp := model.NewAction(model.SOMEONE, model.PICK_UP, model.SOMETHING, model.NOTHING, model.SOMEWHERE, model.DoNothing, func() {
		game.SaySomething("Credo che lo prenderò")
	}, model.DoNothing)
	game.AddAction(genericPickUp)

}
