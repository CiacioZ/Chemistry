package logic

// BinaryRef represents a reference to binary data in the packaged file
type BinaryRef struct {
	Offset int64 `json:"offset"`
	Size   int64 `json:"size"`
}

// PackagedGameData represents the new packaged game data format
type PackagedGameData struct {
	ProjectName  string      `json:"projectName"`
	Version      string      `json:"version"`
	DiagramNodes []TypedNode `json:"diagramNodes"`
	Locations    []Location  `json:"locations"`
	Characters   []Character `json:"characters"`
	Items        []Item      `json:"items"`
	Fonts        []Font      `json:"fonts"`
	Scripts      []Script    `json:"scripts"`
	Cursors      []Cursor    `json:"cursors"`
}

type TypedNode struct {
	ID          string          `json:"id"`
	Type        string          `json:"type"`
	Label       string          `json:"label"`
	Position    NodePosition    `json:"position"`
	Connections NodeConnections `json:"connections"`
	From        string          `json:"from,omitempty"`
	Verb        string          `json:"verb,omitempty"`
	To          string          `json:"to,omitempty"`
	With        string          `json:"with,omitempty"`
	Where       string          `json:"where,omitempty"`
	Script      string          `json:"script,omitempty"`
	Description string          `json:"description,omitempty"`
	Flags       []NodeFlag      `json:"flags,omitempty"`
}

type NodePosition struct {
	Left int `json:"left"`
	Top  int `json:"top"`
}

type NodeConnections struct {
	In  []string `json:"in"`
	Out []string `json:"out"`
}

type NodeFlag struct {
	Name  string `json:"name"`
	Value bool   `json:"value"`
}

type Location struct {
	ID       string           `json:"id"`
	Type     string           `json:"type"`
	Name     string           `json:"name"`
	Internal bool             `json:"internal,omitempty"`
	Details  *LocationDetails `json:"details,omitempty"`
}

type Character struct {
	ID       string            `json:"id"`
	Type     string            `json:"type"`
	Name     string            `json:"name"`
	Internal bool              `json:"internal,omitempty"`
	Details  *CharacterDetails `json:"details,omitempty"`
}

type Item struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Name     string       `json:"name"`
	Internal bool         `json:"internal,omitempty"`
	Details  *ItemDetails `json:"details,omitempty"`
}

type Font struct {
	ID       string       `json:"id"`
	Type     string       `json:"type"`
	Name     string       `json:"name"`
	Internal bool         `json:"internal,omitempty"`
	Details  *FontDetails `json:"details,omitempty"`
}

type Script struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Name     string         `json:"name"`
	Internal bool           `json:"internal,omitempty"`
	Details  *ScriptDetails `json:"details,omitempty"`
}

type Cursor struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Name     string         `json:"name"`
	Internal bool           `json:"internal,omitempty"`
	Details  *CursorDetails `json:"details,omitempty"`
}

type LocationDetails struct {
	Description      string         `json:"description,omitempty"`
	BackgroundRef    *BinaryRef     `json:"backgroundRef,omitempty"`
	WalkableArea     []Polygon      `json:"walkableArea,omitempty"`
	PlacedItems      []PlacedEntity `json:"placedItems,omitempty"`
	PlacedCharacters []PlacedEntity `json:"placedCharacters,omitempty"`
	BackgroundColor  string         `json:"backgroundColor,omitempty"`
}

type CharacterDetails struct {
	Description       string      `json:"description,omitempty"`
	ImageRef          *BinaryRef  `json:"imageRef,omitempty"`
	InventoryImageRef *BinaryRef  `json:"inventoryImageRef,omitempty"`
	Animations        []Animation `json:"animations,omitempty"`
	InteractionSpot   *Point      `json:"interactionSpot,omitempty"`
}

type ItemDetails struct {
	Description       string      `json:"description,omitempty"`
	ImageRef          *BinaryRef  `json:"imageRef,omitempty"`
	CanBePickedUp     bool        `json:"canBePickedUp,omitempty"`
	InventoryImageRef *BinaryRef  `json:"inventoryImageRef,omitempty"`
	Animations        []Animation `json:"animations,omitempty"`
	UseWith           bool        `json:"useWith,omitempty"`
	InteractionSpot   *Point      `json:"interactionSpot,omitempty"`
}

type FontDetails struct {
	FontRef *BinaryRef `json:"fontRef,omitempty"`
}

type ScriptDetails struct {
	ScriptRef *BinaryRef `json:"scriptRef,omitempty"`
}

type CursorDetails struct {
	Animations []Animation `json:"animations,omitempty"`
}

type Animation struct {
	Name   string           `json:"name"`
	Frames []AnimationFrame `json:"frames"`
	Loop   bool             `json:"loop,omitempty"`
}

type AnimationFrame struct {
	ImageRef *BinaryRef `json:"imageRef,omitempty"`
	Duration int        `json:"duration,omitempty"`
}

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Polygon []Point

type PlacedEntity struct {
	EntityID        string `json:"entityId"`
	Position        Point  `json:"position"`
	InteractionSpot Point  `json:"interactionSpot"`
}
