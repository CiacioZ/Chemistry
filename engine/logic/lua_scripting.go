package logic

import (
	"chemistry/engine/model"
	"image"

	lua "github.com/yuin/gopher-lua"
)

// LuaScripting holds the Lua state and provides methods to run scripts.
// TODO: Consider if Game needs a direct reference to LuaScripting or vice-versa,
// or if they interact through a higher-level coordinator.
// For now, we'll pass *Game to the functions that need it.

// Helper to convert model.Item to a Lua table
func itemToLuaTable(L *lua.LState, item model.Item) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "id", lua.LString(item.ID))
	L.SetField(table, "name", lua.LString(item.Name))
	L.SetField(table, "type", lua.LString(string(item.Type)))
	L.SetField(table, "use_with", lua.LBool(item.UseWith))
	L.SetField(table, "pickable", lua.LBool(item.Pickable))
	L.SetField(table, "has_alpha", lua.LBool(item.Alpha != nil))
	L.SetField(table, "has_image", lua.LBool(len(item.Image) > 0))
	L.SetField(table, "has_inventory_image", lua.LBool(len(item.InventoryImage) > 0))
	return table
}

// Helper to convert model.Color to a Lua table
func colorToLuaTable(L *lua.LState, color model.Color) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "r", lua.LNumber(color.R))
	L.SetField(table, "g", lua.LNumber(color.G))
	L.SetField(table, "b", lua.LNumber(color.B))
	return table
}

// Helper to convert model.InventorySlot to a Lua table
func inventorySlotToLuaTable(L *lua.LState, slot model.InventorySlot) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "count", lua.LNumber(slot.Count))
	L.SetField(table, "item", itemToLuaTable(L, slot.Item)) // Reuse itemToLuaTable
	return table
}

// Helper to convert model.Character to a Lua table
func characterToLuaTable(L *lua.LState, char model.Character) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "id", lua.LString(char.ID))
	L.SetField(table, "name", lua.LString(char.Name))
	L.SetField(table, "type", lua.LString(string(char.Type)))
	L.SetField(table, "talk_color", colorToLuaTable(L, char.TalkColor))

	animsTable := L.NewTable()
	for animName := range char.Animations {
		L.SetField(animsTable, animName, lua.LTrue) // Store animation names as keys
	}
	L.SetField(table, "animations", animsTable)

	inventoryTable := L.NewTable()
	for itemID, slot := range char.Inventory {
		L.SetField(inventoryTable, itemID, inventorySlotToLuaTable(L, slot))
	}
	L.SetField(table, "inventory", inventoryTable)

	return table
}

// Helper to register a Go function into the Lua game table
func registerGameFunction(L *lua.LState, gameTable *lua.LTable, funcName string, goFunc func(L *lua.LState, game *Game) int, game *Game) {
	L.SetField(gameTable, funcName, L.NewFunction(func(ls *lua.LState) int {
		// This inner function is what Lua calls. It then calls our goFunc.
		return goFunc(ls, game) // Pass the captured 'game' instance
	}))
}

// NewLuaState creates and initializes a new Lua state with game functions.
func NewLuaState(game *Game) *lua.LState {
	L := lua.NewState()
	// lua.OpenBase(L) // Optional: Load Lua base libraries (print, math, etc.) if scripts need them.
	// lua.OpenTable(L) // For table manipulation utilities
	// lua.OpenString(L) // For string manipulation

	gameTable := L.NewTable()
	L.SetGlobal("game", gameTable)

	// Registering game methods
	registerGameFunction(L, gameTable, "MoveTo", luaMoveTo, game)
	registerGameFunction(L, gameTable, "ItemAt", luaItemAt, game)
	registerGameFunction(L, gameTable, "StopCharacterMovementAnimation", luaStopCharacterMovementAnimation, game)
	registerGameFunction(L, gameTable, "SaySomething", luaSaySomething, game)

	registerGameFunction(L, gameTable, "GetCurrentState", luaGetCurrentState, game)
	registerGameFunction(L, gameTable, "SetCurrentState", luaSetCurrentState, game)
	registerGameFunction(L, gameTable, "GetCurrentVerb", luaGetCurrentVerb, game)
	registerGameFunction(L, gameTable, "SetCurrentVerb", luaSetCurrentVerb, game)
	registerGameFunction(L, gameTable, "SetCurrentCursor", luaSetCurrentCursor, game)

	registerGameFunction(L, gameTable, "GetCurrentLocation", luaGetCurrentLocation, game)
	registerGameFunction(L, gameTable, "SetCurrentLocation", luaSetCurrentLocation, game)
	registerGameFunction(L, gameTable, "GetCurrentCharacter", luaGetCurrentCharacter, game)
	registerGameFunction(L, gameTable, "SetCurrentCharacter", luaSetCurrentCharacter, game)

	registerGameFunction(L, gameTable, "GetFlag", luaGetFlag, game)
	registerGameFunction(L, gameTable, "SetFlag", luaSetFlag, game)
	registerGameFunction(L, gameTable, "GetCounter", luaGetCounter, game)
	registerGameFunction(L, gameTable, "SetCounter", luaSetCounter, game)
	registerGameFunction(L, gameTable, "IncreaseCounter", luaIncreaseCounter, game)

	registerGameFunction(L, gameTable, "GetLocation", luaGetLocation, game)
	registerGameFunction(L, gameTable, "GetCharacter", luaGetCharacter, game)
	registerGameFunction(L, gameTable, "GetItem", luaGetItem, game)

	registerGameFunction(L, gameTable, "GetCurrentCharacterPosition", luaGetCurrentCharacterPosition, game)
	registerGameFunction(L, gameTable, "SetCurrentCharacterPosition", luaSetCurrentCharacterPosition, game)
	registerGameFunction(L, gameTable, "GetCurrentCharacterDirection", luaGetCurrentCharacterDirection, game)
	registerGameFunction(L, gameTable, "SetCurrentCharacterDirection", luaSetCurrentCharacterDirection, game)
	registerGameFunction(L, gameTable, "SetCurrentCharacterAnimationFrame", luaSetCurrentCharacterAnimationFrame, game)
	registerGameFunction(L, gameTable, "SetCurrentCharacterAnimation", luaSetCurrentCharacterAnimation, game)
	registerGameFunction(L, gameTable, "SetCurrentCharacterAnimationAtFrame", luaSetCurrentCharacterAnimationAtFrame, game)
	registerGameFunction(L, gameTable, "AdvanceCurrentAnimationFrame", luaAdvanceCurrentAnimationFrame, game)
	registerGameFunction(L, gameTable, "GetCurrentCharacterAnimation", luaGetCurrentCharacterAnimation, game)

	registerGameFunction(L, gameTable, "ExecuteAction", luaExecuteAction, game)

	// Note: AddFont, AddCursor, AddCharacter, AddItem, AddLocation, AddAction are primarily for setup.
	// They *could* be exposed, but scripts running during an ActionNode might not typically use them.
	// Consider if they are needed for runtime scripting use cases.

	return L
}

// RunScript executes a Lua script string in the given Lua state.
func RunScript(L *lua.LState, script string) error {
	return L.DoString(script)
}

// --- Lua Wrapper Functions ---

func luaMoveTo(L *lua.LState, game *Game) int {
	x := L.CheckInt(2)
	y := L.CheckInt(3)
	game.MoveTo(x, y)
	return 0
}

func luaItemAt(L *lua.LState, game *Game) int {
	x := L.CheckInt(2)
	y := L.CheckInt(3)
	itemName := game.ItemAt(x, y)
	L.Push(lua.LString(itemName))
	return 1
}

func luaStopCharacterMovementAnimation(L *lua.LState, game *Game) int {
	game.SetCurrentCharacterAnimationAtFrame(game.state.currentCharacterAnimation, game.state.currentCharacterAnimationFrame)
	return 0
}

func luaSaySomething(L *lua.LState, game *Game) int {
	sentence := L.CheckString(2)
	game.SaySomething(sentence)
	return 0
}

func luaGetCurrentState(L *lua.LState, game *Game) int {
	state := game.GetCurrentState()
	L.Push(lua.LString(string(state))) // Assuming model.StateType is string-based or convertible
	return 1
}

func luaSetCurrentState(L *lua.LState, game *Game) int {
	stateStr := L.CheckString(2)
	game.SetCurrentState(model.StateType(stateStr))
	return 0
}

func luaGetCurrentVerb(L *lua.LState, game *Game) int {
	verb := game.GetCurrentVerb()
	L.Push(lua.LString(string(verb))) // Assuming model.Verb is string-based
	return 1
}

func luaSetCurrentVerb(L *lua.LState, game *Game) int {
	verbStr := L.CheckString(2)
	game.SetCurrentVerb(model.Verb(verbStr))
	return 0
}

func luaSetCurrentCursor(L *lua.LState, game *Game) int {
	cursorName := L.CheckString(2)
	game.SetCurrentCursor(cursorName)
	return 0
}

// Helper to convert image.Point to a Lua table
func pointToLuaTable(L *lua.LState, p image.Point) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "x", lua.LNumber(p.X))
	L.SetField(table, "y", lua.LNumber(p.Y))
	return table
}

// Helper to convert model.ItemLocation to a Lua table
func itemLocationToLuaTable(L *lua.LState, il model.ItemLocation) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "interaction_point", pointToLuaTable(L, il.InteractionPoint))
	L.SetField(table, "location_point", pointToLuaTable(L, il.LocationPoint))
	return table
}

// Helper to convert model.Layer to a Lua table (simplified)
func layerToLuaTable(L *lua.LState, layer model.Layer) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "has_image", lua.LBool(len(layer.Image) > 0))
	L.SetField(table, "transparent_color", lua.LString(layer.TransparentColor))
	return table
}

// Helper to convert model.WalkableArea to a Lua table (simplified)
func walkableAreaToLuaTable(L *lua.LState, wa model.WalkableArea) *lua.LTable {
	table := L.NewTable()
	polygonsTable := L.NewTable()
	for i, polygon := range wa.Polygons {
		polygonsTable.RawSetInt(i+1, lua.LNumber(len(polygon))) // Use RawSetInt for array-like table
	}
	L.SetField(table, "polygons", polygonsTable)
	return table
}

// Helper to convert model.Location to a Lua table
func locationToLuaTable(L *lua.LState, loc model.Location) *lua.LTable {
	table := L.NewTable()
	L.SetField(table, "id", lua.LString(loc.ID))
	L.SetField(table, "name", lua.LString(loc.Name))
	L.SetField(table, "type", lua.LString(string(loc.Type)))

	layersTable := L.NewTable()
	for i, layer := range loc.GetLayers() { // Use GetLayers getter
		layersTable.RawSetInt(i+1, layerToLuaTable(L, layer)) // Use RawSetInt
	}
	L.SetField(table, "layers", layersTable)

	walkableAreasTable := L.NewTable()
	// This simplified version only gets the first walkable area.
	// A full implementation would need a way to get all walkable areas from model.Location.
	// Safely defer-recover to handle empty walkable areas slice
	func() {
		defer func() { recover() }()
		if len(loc.GetWalkableArea(0).Polygons) > 0 {
			walkableAreasTable.RawSetInt(1, walkableAreaToLuaTable(L, loc.GetWalkableArea(0)))
		}
	}()
	L.SetField(table, "walkable_areas", walkableAreasTable)

	itemsTable := L.NewTable()
	for itemID, itemLoc := range loc.Items {
		L.SetField(itemsTable, itemID, itemLocationToLuaTable(L, itemLoc))
	}
	L.SetField(table, "items", itemsTable)

	return table
}

func luaGetLocation(L *lua.LState, game *Game) int {
	id := L.CheckString(2)
	locData := game.GetLocation(id)
	if locData.ID == "" {
		L.Push(lua.LNil)
	} else {
		L.Push(locationToLuaTable(L, locData))
	}
	return 1
}

func luaGetCurrentLocation(L *lua.LState, game *Game) int {
	locData := game.GetCurrentLocation()
	L.Push(locationToLuaTable(L, locData))
	return 1
}

func luaSetCurrentLocation(L *lua.LState, game *Game) int {
	locationName := L.CheckString(2)
	game.SetCurrentLocation(locationName)
	return 0
}

func luaGetCurrentCharacter(L *lua.LState, game *Game) int {
	char := game.GetCurrentCharacter() // This already returns the model.Character struct
	L.Push(characterToLuaTable(L, char))
	return 1
}

func luaSetCurrentCharacter(L *lua.LState, game *Game) int {
	characterName := L.CheckString(2)
	game.SetCurrentCharacter(characterName)
	return 0
}

func luaGetFlag(L *lua.LState, game *Game) int {
	flagName := L.CheckString(2)
	value := game.GetFlag(flagName)
	L.Push(lua.LBool(value))
	return 1
}

func luaSetFlag(L *lua.LState, game *Game) int {
	flagName := L.CheckString(2)
	flagValue := L.CheckBool(3)
	game.SetFlag(flagName, flagValue)
	return 0
}

func luaGetCounter(L *lua.LState, game *Game) int {
	counterName := L.CheckString(2)
	value := game.GetCounter(counterName)
	L.Push(lua.LNumber(value))
	return 1
}

func luaSetCounter(L *lua.LState, game *Game) int {
	counterName := L.CheckString(2)
	value := L.CheckInt(3)
	game.SetCounter(counterName, value)
	return 0
}

func luaIncreaseCounter(L *lua.LState, game *Game) int {
	counterName := L.CheckString(2)
	value := L.CheckInt(3)
	game.IncreaseCounter(counterName, value)
	return 0
}

func luaGetCharacter(L *lua.LState, game *Game) int {
	id := L.CheckString(2)
	char, exists := game.data.Character[id] // Assuming Character is a map in GameData
	if !exists {
		L.Push(lua.LNil)
		return 1
	}
	L.Push(characterToLuaTable(L, char))
	return 1
}

func luaGetItem(L *lua.LState, game *Game) int {
	id := L.CheckString(2)
	item, exists := game.data.Items[id] // Assuming Items is a map in GameData
	if !exists {
		L.Push(lua.LNil)
		return 1
	}
	L.Push(itemToLuaTable(L, item))
	return 1
}

func luaGetCurrentCharacterPosition(L *lua.LState, game *Game) int {
	pos := game.GetCurrentCharacterPosition()
	table := L.NewTable()
	L.SetField(table, "x", lua.LNumber(pos.X))
	L.SetField(table, "y", lua.LNumber(pos.Y))
	L.Push(table)
	return 1
}

func luaSetCurrentCharacterPosition(L *lua.LState, game *Game) int {
	table := L.CheckTable(2)
	xLv := L.GetField(table, "x")
	yLv := L.GetField(table, "y")
	x, okX := xLv.(lua.LNumber)
	y, okY := yLv.(lua.LNumber)
	if !okX || !okY {
		L.ArgError(1, "expected a table with x and y number fields")
		return 0
	}
	game.SetCurrentCharacterPosition(image.Point{X: int(x), Y: int(y)})
	return 0
}

func luaGetCurrentCharacterDirection(L *lua.LState, game *Game) int {
	dir := game.GetCurrentCharacterDirection()
	L.Push(lua.LString(string(dir))) // Assuming model.CharacterDirection is string-based
	return 1
}

func luaSetCurrentCharacterDirection(L *lua.LState, game *Game) int {
	dirStr := L.CheckString(2)
	game.SetCurrentCharacterDirection(model.CharacterDirection(dirStr))
	return 0
}

func luaSetCurrentCharacterAnimationFrame(L *lua.LState, game *Game) int {
	frame := L.CheckInt(2)
	game.SetCurrentCharacterAnimationFrame(frame)
	return 0
}

func luaSetCurrentCharacterAnimation(L *lua.LState, game *Game) int {
	animName := L.CheckString(2)
	game.SetCurrentCharacterAnimation(animName)
	return 0
}

func luaSetCurrentCharacterAnimationAtFrame(L *lua.LState, game *Game) int {
	animName := L.CheckString(2)
	frame := L.CheckInt(3)
	game.SetCurrentCharacterAnimationAtFrame(animName, frame)
	return 0
}

func luaAdvanceCurrentAnimationFrame(L *lua.LState, game *Game) int {
	game.AdvanceCurrentAnimationFrame()
	return 0
}

func luaGetCurrentCharacterAnimation(L *lua.LState, game *Game) int {
	animName, frame := game.GetCurrentCharacterAnimation()
	L.Push(lua.LString(animName))
	L.Push(lua.LNumber(frame))
	return 2
}

func luaExecuteAction(L *lua.LState, game *Game) int {
	actionString := L.CheckString(2)
	game.ExecuteAction(actionString) // Assuming ExecuteAction handles parsing this string
	return 0
}
