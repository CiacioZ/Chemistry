package main

import (
	"encoding/gob"
	"encoding/json"
	"fmt" // Per Go < 1.16, altrimenti usa io e os
	"log"
	"os" // Per Go >= 1.16
)

// --- Definizioni Strutture Comuni ---
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

type AnimationFrame struct {
	ImageData string `json:"imageData"`
	Duration  int    `json:"duration,omitempty"`
}

type Animation struct {
	Name   string           `json:"name"`
	Frames []AnimationFrame `json:"frames"`
	Loop   bool             `json:"loop,omitempty"`
}

// --- Dettagli Entità ---
type LocationDetails struct {
	Description      string         `json:"description,omitempty"`
	BackgroundImage  string         `json:"backgroundImage,omitempty"`
	WalkableArea     [][]Point      `json:"walkableArea,omitempty"` // Array di poligoni
	Polygons         []Polygon      `json:"polygons,omitempty"`
	PlacedItems      []PlacedEntity `json:"placedItems,omitempty"`
	PlacedCharacters []PlacedEntity `json:"placedCharacters,omitempty"`
	BackgroundColor  string         `json:"backgroundColor,omitempty"`
}

type CharacterDetails struct {
	Description        string      `json:"description,omitempty"`
	ImageData          string      `json:"imageData,omitempty"`
	InventoryImageData string      `json:"inventoryImageData,omitempty"`
	Animations         []Animation `json:"animations,omitempty"`
	InteractionSpot    *Point      `json:"interactionSpot,omitempty"`
}

type ItemDetails struct {
	Description        string      `json:"description,omitempty"`
	ImageData          string      `json:"imageData,omitempty"`
	CanBePickedUp      bool        `json:"canBePickedUp,omitempty"`
	InventoryImageData string      `json:"inventoryImageData,omitempty"`
	Animations         []Animation `json:"animations,omitempty"`
	UseWith            bool        `json:"useWith,omitempty"`
	InteractionSpot    *Point      `json:"interactionSpot,omitempty"`
}

type FontDetails struct {
	FontFileUrl string `json:"fontFileUrl,omitempty"`
}

type ScriptDetails struct {
	ScriptContent string `json:"scriptContent,omitempty"`
}

// ActionDetails - definiscila se usata come entità separata
type ActionDetails struct {
	ActionType     string `json:"actionType,omitempty"`
	TargetEntityId string `json:"targetEntityId,omitempty"`
	// Altri campi specifici per le azioni
}

// --- Nodi del Diagramma ---
type NodeFlag struct {
	Name  string `json:"name"`
	Value bool   `json:"value"`
}

type NodePosition struct {
	Left int `json:"left"`
	Top  int `json:"top"`
}

type NodeConnections struct {
	In  []string `json:"in"`
	Out []string `json:"out"`
}

// --- Struttura per le Entità Generiche (per il parsing in due fasi) ---
type GenericEntity struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	Name       string          `json:"name"`
	Internal   bool            `json:"internal,omitempty"`
	DetailsRaw json.RawMessage `json:"details,omitempty"`
}

// --- ProjectData (Struttura principale del JSON) ---
type ProjectData struct {
	Version     string            `json:"version"`
	ProjectName string            `json:"projectName"`
	Nodes       []json.RawMessage `json:"nodes"`
	Entities    []GenericEntity   `json:"entities"`
}

// Strutture complete per le Entità (da usare dopo il parsing in due fasi di GenericEntity)
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

type Action struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Name     string         `json:"name"`
	Internal bool           `json:"internal,omitempty"`
	Details  *ActionDetails `json:"details,omitempty"`
}

// TypedNode (per il parsing in due fasi dei nodi del diagramma)
type TypedNode struct {
	ID          string          `json:"id"`
	Type        string          `json:"type"`
	Label       string          `json:"label"`
	Position    NodePosition    `json:"position"`
	Connections NodeConnections `json:"connections"`
	// Campi specifici
	From        string     `json:"from,omitempty"`
	Verb        string     `json:"verb,omitempty"`
	To          string     `json:"to,omitempty"`
	With        string     `json:"with,omitempty"`
	Where       string     `json:"where,omitempty"`
	Script      string     `json:"script,omitempty"`
	Description string     `json:"description,omitempty"`
	Flags       []NodeFlag `json:"flags,omitempty"`
}

// Nuova struct per contenere tutti i dati da salvare con gob
type PackagedGameData struct {
	ProjectName  string
	Version      string
	DiagramNodes []TypedNode
	Locations    []Location
	Characters   []Character
	Items        []Item
	Fonts        []Font
	Scripts      []Script
	Actions      []Action // Includi se usi le entità Action
}

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("Usage: %s <path_to_json_file>", os.Args[0])
	}
	jsonFilePath := os.Args[1]

	log.Printf("Reading project file from: %s\n", jsonFilePath)
	jsonData, err := os.ReadFile(jsonFilePath) // os.ReadFile è per Go >= 1.16
	if err != nil {
		log.Fatalf("Error reading JSON file: %v\n", err)
	}
	log.Println("Successfully read JSON file.")

	var projectData ProjectData
	err = json.Unmarshal(jsonData, &projectData)
	if err != nil {
		log.Fatalf("Error unmarshalling project JSON: %v\n", err)
	}
	log.Printf("Successfully unmarshalled project data for: %s (Version: %s)\n", projectData.ProjectName, projectData.Version)

	fmt.Printf("Project Name: %s\n", projectData.ProjectName)
	fmt.Printf("Number of raw diagram nodes: %d\n", len(projectData.Nodes))
	fmt.Printf("Number of generic entities: %d\n", len(projectData.Entities))

	// --- Parsing in due fasi per DiagramNodes ---
	var parsedDiagramNodes []TypedNode
	for i, rawNode := range projectData.Nodes {
		var node TypedNode
		if err := json.Unmarshal(rawNode, &node); err != nil {
			log.Printf("Error unmarshalling node #%d: %v\n", i, err)
			continue
		}
		parsedDiagramNodes = append(parsedDiagramNodes, node)
		// log.Printf("Parsed Node (%s): %s\n", node.Type, node.Label)
	}
	log.Printf("Successfully parsed %d diagram nodes.\n", len(parsedDiagramNodes))
	// Esempio di accesso
	/*
	   if len(parsedDiagramNodes) > 0 && parsedDiagramNodes[0].Type == "state" {
	       fmt.Printf("First node is a State with description: %s and flags: %+v\n", parsedDiagramNodes[0].Description, parsedDiagramNodes[0].Flags)
	   }
	*/

	// --- Parsing in due fasi per Entities ---
	var locations []Location
	var characters []Character
	var items []Item
	var fonts []Font
	var scripts []Script
	var actions []Action

	for _, genericEntity := range projectData.Entities {
		switch genericEntity.Type {
		case "Location":
			var details LocationDetails
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &details); err != nil {
					log.Printf("Error unmarshalling LocationDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}
			locations = append(locations, Location{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		case "Character":
			var details CharacterDetails
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &details); err != nil {
					log.Printf("Error unmarshalling CharacterDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}
			characters = append(characters, Character{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		case "Item":
			var details ItemDetails
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &details); err != nil {
					log.Printf("Error unmarshalling ItemDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}
			items = append(items, Item{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		case "Font":
			var details FontDetails
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &details); err != nil {
					log.Printf("Error unmarshalling FontDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}
			fonts = append(fonts, Font{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		case "Script":
			var details ScriptDetails
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &details); err != nil {
					log.Printf("Error unmarshalling ScriptDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}
			scripts = append(scripts, Script{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		case "Action":
			var details ActionDetails
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &details); err != nil {
					log.Printf("Error unmarshalling ActionDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}
			actions = append(actions, Action{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		default:
			log.Printf("Unknown entity type '%s' for entity ID %s, Name %s\n", genericEntity.Type, genericEntity.ID, genericEntity.Name)
		}
	}

	log.Printf("Parsed Locations: %d, Characters: %d, Items: %d, Fonts: %d, Scripts: %d, Actions: %d\n",
		len(locations), len(characters), len(items), len(fonts), len(scripts), len(actions))

	// Esempi di accesso ai dati parsati:
	/*
			if len(locations) > 0 && locations[0].Details != nil {
				fmt.Printf("First location name: %s, Description: %s\n", locations[0].Name, locations[0].Details.Description)
		        if len(locations[0].Details.Polygons) > 0 {
		            fmt.Printf("First polygon of first location: %+v\n", locations[0].Details.Polygons[0])
		        }
			}
		    if len(items) > 0 {
		        for _, item := range items {
		            if item.Name == "Key" && item.Details != nil {
		                 fmt.Printf("Key item image data (first 30 chars): %.30s...\n", item.Details.ImageData)
		                 break
		            }
		        }
		    }
	*/

	// Creare l'oggetto PackagedGameData
	gameDataToPackage := PackagedGameData{
		ProjectName:  projectData.ProjectName,
		Version:      projectData.Version,
		DiagramNodes: parsedDiagramNodes,
		Locations:    locations,
		Characters:   characters,
		Items:        items,
		Fonts:        fonts,
		Scripts:      scripts,
		Actions:      actions,
	}

	// Definire il percorso del file di output binario
	outputFilePath := projectData.ProjectName + "_packaged.data" // Estensione .data o .gob o .bin
	// Sostituisci caratteri non validi per i nomi di file se projectName può contenerli
	// outputFilePath = strings.ReplaceAll(projectData.ProjectName, " ", "_") + "_packaged.data"

	file, err := os.Create(outputFilePath)
	if err != nil {
		log.Fatalf("Error creating output file %s: %v", outputFilePath, err)
	}
	defer file.Close()

	encoder := gob.NewEncoder(file)
	err = encoder.Encode(gameDataToPackage)
	if err != nil {
		log.Fatalf("Error encoding data with gob: %v", err)
	}

	log.Printf("Game data successfully packaged to: %s\n", outputFilePath)
	log.Println("Packager finished.")
}
