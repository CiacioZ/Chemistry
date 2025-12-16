package logic

import (
	"chemistry/engine/model"
	"testing"
)

func TestLuaBindingsMethods(t *testing.T) {
	// Setup minimal game instance strictly for Lua testing
	game := &Game{
		data:  initGameData(),
		state: initGameState(),
	}
	game.data.Character["Guybrush"] = model.NewCharacter("Guybrush", "Guybrush", model.Color{R: 255, G: 255, B: 255})

	L := NewLuaState(game)
	defer L.Close()

	// Test script using method syntax (passing 'self' implicitly)
	// We test GetCharacter specifically as it was the reported issue.
	// We also test SetFlag/GetFlag as they represent typical void and return-value functions.
	script := `
        local c = game:GetCharacter("Guybrush")
        if not c then error("Character not found") end
        if c.name ~= "Guybrush" then error("Wrong name") end
        
        game:SetFlag("test_flag", true)
        if not game:GetFlag("test_flag") then error("Flag not set") end

		-- Test a function that had multiple args adjusted
		game:SetCounter("my_counter", 10)
		if game:GetCounter("my_counter") ~= 10 then error("Counter not set correctly") end
		game:IncreaseCounter("my_counter", 5)
		if game:GetCounter("my_counter") ~= 15 then error("Counter not increased correctly") end
    `

	if err := RunScript(L, script); err != nil {
		t.Errorf("Lua script failed: %v", err)
	}
}
