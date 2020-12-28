package gamelogicmanager

import (
	"chemistry/sdk"

	"github.com/mattn/anko/vm"
)

type scripthandler struct {
	env *vm.Env
}

func NewAnkoGameLogicHandler() sdk.GameLogicHandler {

	scripthandler := scripthandler{
		env: vm.NewEnv(),
	}

	return scripthandler

}
