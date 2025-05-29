package model

import "encoding/json"

type EditorPoint struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type EditorPolygon []EditorPoint

type EditorPlacedEntity struct {
	EntityID        string      `json:"entityId"`
	Position        EditorPoint `json:"position"`
	InteractionSpot EditorPoint `json:"interactionSpot"`
}

type EditorAnimationFrame struct {
	ImageData string `json:"imageData"`
	Duration  int    `json:"duration,omitempty"`
}

type EditorAnimation struct {
	Name   string                 `json:"name"`
	Frames []EditorAnimationFrame `json:"frames"`
	Loop   bool                   `json:"loop,omitempty"`
}

// --- Dettagli Entità ---
type EditorLocationDetails struct {
	Description      string               `json:"description,omitempty"`
	BackgroundImage  string               `json:"backgroundImage,omitempty"`
	WalkableArea     [][]EditorPoint      `json:"walkableArea,omitempty"` // Array di poligoni
	Polygons         []EditorPolygon      `json:"polygons,omitempty"`
	PlacedItems      []EditorPlacedEntity `json:"placedItems,omitempty"`
	PlacedCharacters []EditorPlacedEntity `json:"placedCharacters,omitempty"`
	BackgroundColor  string               `json:"backgroundColor,omitempty"`
}

type EditorCharacterDetails struct {
	Description        string            `json:"description,omitempty"`
	ImageData          string            `json:"imageData,omitempty"`
	InventoryImageData string            `json:"inventoryImageData,omitempty"`
	Animations         []EditorAnimation `json:"animations,omitempty"`
	InteractionSpot    *EditorPoint      `json:"interactionSpot,omitempty"`
}

type EditorItemDetails struct {
	Description        string            `json:"description,omitempty"`
	ImageData          string            `json:"imageData,omitempty"`
	CanBePickedUp      bool              `json:"canBePickedUp,omitempty"`
	InventoryImageData string            `json:"inventoryImageData,omitempty"`
	Animations         []EditorAnimation `json:"animations,omitempty"`
	UseWith            bool              `json:"useWith,omitempty"`
	InteractionSpot    *EditorPoint      `json:"interactionSpot,omitempty"`
}

type EditorFontDetails struct {
	FontFileUrl string `json:"fontFileUrl,omitempty"`
}

type EditorScriptDetails struct {
	ScriptContent string `json:"scriptContent,omitempty"`
}

// ActionDetails - definiscila se usata come entità separata
type EditorActionDetails struct {
	ActionType     string `json:"actionType,omitempty"`
	TargetEntityId string `json:"targetEntityId,omitempty"`
	// Altri campi specifici per le azioni
}

// --- Nodi del Diagramma ---
type EditorNodeFlag struct {
	Name  string `json:"name"`
	Value bool   `json:"value"`
}

type EditorNodePosition struct {
	Left int `json:"left"`
	Top  int `json:"top"`
}

type EditorNodeConnections struct {
	In  []string `json:"in"`
	Out []string `json:"out"`
}

// --- Struttura per le Entità Generiche (per il parsing in due fasi) ---
type EditorGenericEntity struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	Name       string          `json:"name"`
	Internal   bool            `json:"internal,omitempty"`
	DetailsRaw json.RawMessage `json:"details,omitempty"`
}

// --- ProjectData (Struttura principale del JSON) ---
type ProjectData struct {
	Version     string                `json:"version"`
	ProjectName string                `json:"projectName"`
	Nodes       []json.RawMessage     `json:"nodes"`
	Entities    []EditorGenericEntity `json:"entities"`
}

// Strutture complete per le Entità (da usare dopo il parsing in due fasi di GenericEntity)
type EditorLocation struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Name     string                 `json:"name"`
	Internal bool                   `json:"internal,omitempty"`
	Details  *EditorLocationDetails `json:"details,omitempty"`
}

type EditorCharacter struct {
	ID       string                  `json:"id"`
	Type     string                  `json:"type"`
	Name     string                  `json:"name"`
	Internal bool                    `json:"internal,omitempty"`
	Details  *EditorCharacterDetails `json:"details,omitempty"`
}

type EditorItem struct {
	ID       string             `json:"id"`
	Type     string             `json:"type"`
	Name     string             `json:"name"`
	Internal bool               `json:"internal,omitempty"`
	Details  *EditorItemDetails `json:"details,omitempty"`
}

type EditorFont struct {
	ID       string             `json:"id"`
	Type     string             `json:"type"`
	Name     string             `json:"name"`
	Internal bool               `json:"internal,omitempty"`
	Details  *EditorFontDetails `json:"details,omitempty"`
}

type EditorScript struct {
	ID       string               `json:"id"`
	Type     string               `json:"type"`
	Name     string               `json:"name"`
	Internal bool                 `json:"internal,omitempty"`
	Details  *EditorScriptDetails `json:"details,omitempty"`
}

type EditorAction struct {
	ID       string               `json:"id"`
	Type     string               `json:"type"`
	Name     string               `json:"name"`
	Internal bool                 `json:"internal,omitempty"`
	Details  *EditorActionDetails `json:"details,omitempty"`
}

// TypedNode (per il parsing in due fasi dei nodi del diagramma)
type EditorTypedNode struct {
	ID          string                `json:"id"`
	Type        string                `json:"type"`
	Label       string                `json:"label"`
	Position    EditorNodePosition    `json:"position"`
	Connections EditorNodeConnections `json:"connections"`
	// Campi specifici
	From        string           `json:"from,omitempty"`
	Verb        string           `json:"verb,omitempty"`
	To          string           `json:"to,omitempty"`
	With        string           `json:"with,omitempty"`
	Where       string           `json:"where,omitempty"`
	Script      string           `json:"script,omitempty"`
	Description string           `json:"description,omitempty"`
	Flags       []EditorNodeFlag `json:"flags,omitempty"`
}

// Nuova struct per contenere tutti i dati da salvare con gob
type PackagedGameData struct {
	ProjectName  string
	Version      string
	DiagramNodes []EditorTypedNode
	Locations    []EditorLocation
	Characters   []EditorCharacter
	Items        []EditorItem
	Fonts        []EditorFont
	Scripts      []EditorScript
}
