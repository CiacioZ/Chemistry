package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
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

// BinaryRef rappresenta un riferimento a dati nel file binario
type BinaryRef struct {
	Offset int64 `json:"offset"`
	Size   int64 `json:"size"`
}

type AnimationFrame struct {
	ImageRef *BinaryRef `json:"imageRef,omitempty"`
	Duration int        `json:"duration,omitempty"`
}

type Animation struct {
	Name   string           `json:"name"`
	Frames []AnimationFrame `json:"frames"`
	Loop   bool             `json:"loop,omitempty"`
}

// --- Dettagli Entità ---
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

type ActionDetails struct {
	ActionType     string `json:"actionType,omitempty"`
	TargetEntityId string `json:"targetEntityId,omitempty"`
}

type CursorDetails struct {
	Animations []Animation `json:"animations,omitempty"`
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

// Strutture complete per le Entità
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

type Cursor struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"`
	Name     string         `json:"name"`
	Internal bool           `json:"internal,omitempty"`
	Details  *CursorDetails `json:"details,omitempty"`
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

// Strutture originali per il parsing
type LocationDetailsOrig struct {
	Description      string         `json:"description,omitempty"`
	BackgroundImage  string         `json:"backgroundImage,omitempty"`
	WalkableArea     []Polygon      `json:"walkableArea,omitempty"`
	PlacedItems      []PlacedEntity `json:"placedItems,omitempty"`
	PlacedCharacters []PlacedEntity `json:"placedCharacters,omitempty"`
	BackgroundColor  string         `json:"backgroundColor,omitempty"`
}

type CharacterDetailsOrig struct {
	Description        string          `json:"description,omitempty"`
	ImageData          string          `json:"imageData,omitempty"`
	InventoryImageData string          `json:"inventoryImageData,omitempty"`
	Animations         []AnimationOrig `json:"animations,omitempty"`
	InteractionSpot    *Point          `json:"interactionSpot,omitempty"`
}

type ItemDetailsOrig struct {
	Description        string          `json:"description,omitempty"`
	ImageData          string          `json:"imageData,omitempty"`
	CanBePickedUp      bool            `json:"canBePickedUp,omitempty"`
	InventoryImageData string          `json:"inventoryImageData,omitempty"`
	Animations         []AnimationOrig `json:"animations,omitempty"`
	UseWith            bool            `json:"useWith,omitempty"`
	InteractionSpot    *Point          `json:"interactionSpot,omitempty"`
}

type AnimationOrig struct {
	Name   string               `json:"name"`
	Frames []AnimationFrameOrig `json:"frames"`
	Loop   bool                 `json:"loop,omitempty"`
}

type AnimationFrameOrig struct {
	ImageData string `json:"imageData"`
	Duration  int    `json:"duration,omitempty"`
}

type FontDetailsOrig struct {
	FontFileUrl string `json:"fontFileUrl,omitempty"`
}

type ScriptDetailsOrig struct {
	ScriptContent string `json:"scriptContent,omitempty"`
}

type CursorDetailsOrig struct {
	Animations []AnimationOrig `json:"animations,omitempty"`
}

func writeBinaryData(binFile *os.File, data string) (*BinaryRef, error) {
	if data == "" {
		return nil, nil
	}

	// Handle data URL format (data:mime/type;base64,actualdata)
	var base64Data string
	if strings.HasPrefix(data, "data:") {
		parts := strings.Split(data, ",")
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid data URL format")
		}
		base64Data = parts[1]
	} else {
		base64Data = data
	}

	decoded, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, err
	}

	offset, err := binFile.Seek(0, os.SEEK_CUR)
	if err != nil {
		return nil, err
	}

	n, err := binFile.Write(decoded)
	if err != nil {
		return nil, err
	}

	return &BinaryRef{Offset: offset, Size: int64(n)}, nil
}

func encryptJSON(data []byte, projectName string) ([]byte, error) {
	// Genera chiave da project name (in produzione usa una chiave più sicura)
	hash := sha256.Sum256([]byte(projectName))
	key := hash[:]

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	return gcm.Seal(nonce, nonce, data, nil), nil
}

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("Usage: %s <path_to_json_file>", os.Args[0])
	}
	jsonFilePath := os.Args[1]

	log.Printf("Reading project file from: %s\n", jsonFilePath)
	jsonData, err := os.ReadFile(jsonFilePath)
	if err != nil {
		log.Fatalf("Error reading JSON file: %v\n", err)
	}

	var projectData ProjectData
	err = json.Unmarshal(jsonData, &projectData)
	if err != nil {
		log.Fatalf("Error unmarshalling project JSON: %v\n", err)
	}
	log.Printf("Successfully unmarshalled project data for: %s (Version: %s)\n", projectData.ProjectName, projectData.Version)

	// Crea file binario
	binFilePath := projectData.ProjectName + "_data.bin"
	binFile, err := os.Create(binFilePath)
	if err != nil {
		log.Fatalf("Error creating binary file: %v", err)
	}
	defer binFile.Close()

	// Parse diagram nodes
	var parsedDiagramNodes []TypedNode
	for i, rawNode := range projectData.Nodes {
		var node TypedNode
		if err := json.Unmarshal(rawNode, &node); err != nil {
			log.Printf("Error unmarshalling node #%d: %v\n", i, err)
			continue
		}
		parsedDiagramNodes = append(parsedDiagramNodes, node)
	}
	log.Printf("Successfully parsed %d diagram nodes.\n", len(parsedDiagramNodes))

	// Parse entities
	var locations []Location
	var characters []Character
	var items []Item
	var fonts []Font
	var scripts []Script
	var cursors []Cursor

	for _, genericEntity := range projectData.Entities {
		switch genericEntity.Type {
		case "Location":
			var detailsOrig LocationDetailsOrig
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &detailsOrig); err != nil {
					log.Printf("Error unmarshalling LocationDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}

			details := LocationDetails{
				Description:      detailsOrig.Description,
				WalkableArea:     detailsOrig.WalkableArea,
				PlacedItems:      detailsOrig.PlacedItems,
				PlacedCharacters: detailsOrig.PlacedCharacters,
				BackgroundColor:  detailsOrig.BackgroundColor,
			}

			if detailsOrig.BackgroundImage != "" {
				ref, err := writeBinaryData(binFile, detailsOrig.BackgroundImage)
				if err != nil {
					log.Printf("Error writing background image for %s: %v\n", genericEntity.ID, err)
				} else {
					details.BackgroundRef = ref
				}
			}

			locations = append(locations, Location{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})

		case "Character":
			var detailsOrig CharacterDetailsOrig
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &detailsOrig); err != nil {
					log.Printf("Error unmarshalling CharacterDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}

			details := CharacterDetails{
				Description:     detailsOrig.Description,
				InteractionSpot: detailsOrig.InteractionSpot,
			}

			if detailsOrig.ImageData != "" {
				ref, err := writeBinaryData(binFile, detailsOrig.ImageData)
				if err != nil {
					log.Printf("Error writing image for %s: %v\n", genericEntity.ID, err)
				} else {
					details.ImageRef = ref
				}
			}

			if detailsOrig.InventoryImageData != "" {
				ref, err := writeBinaryData(binFile, detailsOrig.InventoryImageData)
				if err != nil {
					log.Printf("Error writing inventory image for %s: %v\n", genericEntity.ID, err)
				} else {
					details.InventoryImageRef = ref
				}
			}

			for _, animOrig := range detailsOrig.Animations {
				anim := Animation{Name: animOrig.Name, Loop: animOrig.Loop}
				for _, frameOrig := range animOrig.Frames {
					frame := AnimationFrame{Duration: frameOrig.Duration}
					if frameOrig.ImageData != "" {
						ref, err := writeBinaryData(binFile, frameOrig.ImageData)
						if err != nil {
							log.Printf("Error writing animation frame: %v\n", err)
						} else {
							frame.ImageRef = ref
						}
					}
					anim.Frames = append(anim.Frames, frame)
				}
				details.Animations = append(details.Animations, anim)
			}

			characters = append(characters, Character{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})

		case "Item":
			var detailsOrig ItemDetailsOrig
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &detailsOrig); err != nil {
					log.Printf("Error unmarshalling ItemDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}

			details := ItemDetails{
				Description:     detailsOrig.Description,
				CanBePickedUp:   detailsOrig.CanBePickedUp,
				UseWith:         detailsOrig.UseWith,
				InteractionSpot: detailsOrig.InteractionSpot,
			}

			if detailsOrig.ImageData != "" {
				ref, err := writeBinaryData(binFile, detailsOrig.ImageData)
				if err != nil {
					log.Printf("Error writing image for %s: %v\n", genericEntity.ID, err)
				} else {
					details.ImageRef = ref
				}
			}

			if detailsOrig.InventoryImageData != "" {
				ref, err := writeBinaryData(binFile, detailsOrig.InventoryImageData)
				if err != nil {
					log.Printf("Error writing inventory image for %s: %v\n", genericEntity.ID, err)
				} else {
					details.InventoryImageRef = ref
				}
			}

			for _, animOrig := range detailsOrig.Animations {
				anim := Animation{Name: animOrig.Name, Loop: animOrig.Loop}
				for _, frameOrig := range animOrig.Frames {
					frame := AnimationFrame{Duration: frameOrig.Duration}
					if frameOrig.ImageData != "" {
						ref, err := writeBinaryData(binFile, frameOrig.ImageData)
						if err != nil {
							log.Printf("Error writing animation frame: %v\n", err)
						} else {
							frame.ImageRef = ref
						}
					}
					anim.Frames = append(anim.Frames, frame)
				}
				details.Animations = append(details.Animations, anim)
			}

			items = append(items, Item{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})

		case "Font":
			var detailsOrig FontDetailsOrig
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &detailsOrig); err != nil {
					log.Printf("Error unmarshalling FontDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}

			details := FontDetails{}
			if detailsOrig.FontFileUrl != "" {
				ref, err := writeBinaryData(binFile, detailsOrig.FontFileUrl)
				if err != nil {
					log.Printf("Error writing font for %s: %v\n", genericEntity.ID, err)
				} else {
					details.FontRef = ref
				}
			}

			fonts = append(fonts, Font{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})

		case "Script":
			var detailsOrig ScriptDetailsOrig
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &detailsOrig); err != nil {
					log.Printf("Error unmarshalling ScriptDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}

			details := ScriptDetails{}
			if detailsOrig.ScriptContent != "" {
				// Script content is text, not base64, so encode it first
				scriptBytes := []byte(detailsOrig.ScriptContent)
				offset, err := binFile.Seek(0, os.SEEK_CUR)
				if err != nil {
					log.Printf("Error getting offset for script %s: %v\n", genericEntity.ID, err)
				} else {
					n, err := binFile.Write(scriptBytes)
					if err != nil {
						log.Printf("Error writing script for %s: %v\n", genericEntity.ID, err)
					} else {
						details.ScriptRef = &BinaryRef{Offset: offset, Size: int64(n)}
					}
				}
			}

			scripts = append(scripts, Script{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})

		case "Cursor":
			var detailsOrig CursorDetailsOrig
			if len(genericEntity.DetailsRaw) > 0 && string(genericEntity.DetailsRaw) != "null" {
				if err := json.Unmarshal(genericEntity.DetailsRaw, &detailsOrig); err != nil {
					log.Printf("Error unmarshalling CursorDetails for entity %s: %v\n", genericEntity.ID, err)
					continue
				}
			}

			details := CursorDetails{}
			for _, animOrig := range detailsOrig.Animations {
				anim := Animation{Name: animOrig.Name, Loop: animOrig.Loop}
				for _, frameOrig := range animOrig.Frames {
					frame := AnimationFrame{Duration: frameOrig.Duration}
					if frameOrig.ImageData != "" {
						ref, err := writeBinaryData(binFile, frameOrig.ImageData)
						if err != nil {
							log.Printf("Error writing cursor animation frame: %v\n", err)
						} else {
							frame.ImageRef = ref
						}
					}
					anim.Frames = append(anim.Frames, frame)
				}
				details.Animations = append(details.Animations, anim)
			}

			cursors = append(cursors, Cursor{ID: genericEntity.ID, Type: genericEntity.Type, Name: genericEntity.Name, Internal: genericEntity.Internal, Details: &details})
		}
	}

	log.Printf("Parsed Locations: %d, Characters: %d, Items: %d, Fonts: %d, Scripts: %d, Cursors: %d\n",
		len(locations), len(characters), len(items), len(fonts), len(scripts), len(cursors))

	gameDataToPackage := PackagedGameData{
		ProjectName:  projectData.ProjectName,
		Version:      projectData.Version,
		DiagramNodes: parsedDiagramNodes,
		Locations:    locations,
		Characters:   characters,
		Items:        items,
		Fonts:        fonts,
		Scripts:      scripts,
		Cursors:      cursors,
	}

	// Serializza JSON in memoria
	gameData, err := json.Marshal(gameDataToPackage)
	if err != nil {
		log.Fatalf("Error marshalling JSON: %v", err)
	}

	// Cifra il JSON
	encryptedData, err := encryptJSON(gameData, projectData.ProjectName)
	if err != nil {
		log.Fatalf("Error encrypting JSON: %v", err)
	}

	// Salva il file cifrato
	jsonFilePath = projectData.ProjectName + "_packaged.dat"
	err = os.WriteFile(jsonFilePath, encryptedData, 0644)
	if err != nil {
		log.Fatalf("Error writing encrypted file: %v", err)
	}

	log.Printf("Game data successfully packaged to: %s and %s\n", jsonFilePath, binFilePath)
	fmt.Printf("Binary file size: %d bytes\n", func() int64 {
		stat, _ := binFile.Stat()
		return stat.Size()
	}())
	log.Println("Packager finished.")
}
