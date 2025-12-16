package logic

import (
	"chemistry/engine/model"
	"encoding/base64"
	"image"
	"log"
	"strings"
)

// MapPackagedData converts the loaded PackagedGameData into the runtime GameData structure.
func (g *Game) MapPackagedData(pkgData model.PackagedGameData) error {
	// 1. Locations
	for _, l := range pkgData.Locations {
		location := model.NewLocation(l.ID, l.Name, nil) // Background loaded separately via layers
		if l.Details != nil {
			// Background Image
			if l.Details.BackgroundImage != "" {
				bgBytes, err := decodeBase64(l.Details.BackgroundImage)
				if err != nil {
					log.Printf("Error decoding background for location %s: %v", l.Name, err)
				} else {
					// Manually add the background layer as NewLocation's buffer argument is for init
					// logic/entities.go: NewLocation puts it in layers[0].
					// We might need to adjust or overwrite layers[0] or append.
					// Reviewing NewLocation: it appends a layer.
					// Let's reset layers and add this one.
					location = model.NewLocation(l.ID, l.Name, bgBytes)
				}
			}

			// Walkable Areas (Polygon arrays)
			// EditorLocationDetails has WalkableArea [][]EditorPoint
			// Convert to model.WalkableArea
			if len(l.Details.WalkableArea) > 0 {
				var polyPoints [][]image.Point
				for _, poly := range l.Details.WalkableArea {
					var points []image.Point
					for _, p := range poly {
						points = append(points, image.Point{X: p.X, Y: p.Y})
					}
					polyPoints = append(polyPoints, points)
				}
				location.AddWalkableArea(model.WalkableArea{Polygons: polyPoints})
			}

			// Placed Items
			for _, placedItem := range l.Details.PlacedItems {
				location.AddItem(placedItem.EntityID, model.ItemLocation{
					LocationPoint:    image.Point{X: placedItem.Position.X, Y: placedItem.Position.Y},
					InteractionPoint: image.Point{X: placedItem.InteractionSpot.X, Y: placedItem.InteractionSpot.Y},
				})
			}
		}
		g.AddLocation(location)
	}

	// 2. Characters
	for _, c := range pkgData.Characters {
		// NewCharacter(id string, name string, talkColor Color)
		// Default talk color white if not specified (not in PackagedData explicitly? check struct)
		// Check EditorCharacterDetails for specific color? No, it's not there. defaulting.
		char := model.NewCharacter(c.ID, c.Name, model.Color{R: 255, G: 255, B: 255})

		if c.Details != nil {
			// Animations
			for _, anim := range c.Details.Animations {
				var frames [][]byte
				for _, frame := range anim.Frames {
					b, err := decodeBase64(frame.ImageData)
					if err != nil {
						log.Printf("Error decoding animation frame for char %s: %v", c.Name, err)
						continue
					}
					frames = append(frames, b)
				}
				char.Animations[anim.Name] = frames
			}
		}
		g.AddCharacter(char)
	}

	// 3. Items
	for _, i := range pkgData.Items {
		// NewItem(id string, name string, useWith bool, pickable bool, sprite []byte)
		// Sprite is technically the raw image data.
		var spriteBytes []byte
		var err error
		if i.Details != nil && i.Details.ImageData != "" {
			spriteBytes, err = decodeBase64(i.Details.ImageData)
			if err != nil {
				log.Printf("Error decoding item image %s: %v", i.Name, err)
			}
		}

		pickable := false
		useWith := false
		if i.Details != nil {
			pickable = i.Details.CanBePickedUp
			useWith = i.Details.UseWith
		}

		item := model.NewItem(i.ID, i.Name, useWith, pickable, spriteBytes)

		// Add Animations if any
		if i.Details != nil {
			for _, anim := range i.Details.Animations {
				var frames [][]byte
				for _, frame := range anim.Frames {
					b, err := decodeBase64(frame.ImageData)
					if err != nil {
						log.Printf("Error decoding animation frame for item %s: %v", i.Name, err)
						continue
					}
					frames = append(frames, b)
				}
				item.Animations[anim.Name] = frames
			}

			// Inventory Image
			if i.Details.InventoryImageData != "" {
				invBytes, err := decodeBase64(i.Details.InventoryImageData)
				if err == nil {
					item.InventoryImage = invBytes
				}
			}
		}
		g.AddItem(item)
	}

	// 4. Scripts
	for _, s := range pkgData.Scripts {
		if s.Details != nil {
			g.AddScript(s.Name, s.Details.ScriptContent)
		}
	}

	// 5. Actions / Triggers (From Diagram Nodes)
	// The diagram nodes contain the logic links.
	for _, node := range pkgData.DiagramNodes {
		// We look for specific node types that represent actions or links?
		// Actually, the previous GameData struct has `Triggers map[string]model.Action`
		// Actions seem to be defined by `From -> Verb -> To ...` connections or nodes.
		// Let's look at `EditorTypedNode` in `model/editor.go`.
		// It has `Verb`, `From`, `To`, `With`, `Where`, `Script`.
		// This looks like it directly maps to an Action.

		if node.Type == "action" || (node.Verb != "" && node.From != "") { // Assuming "action" type or presence of verb/from
			// Construct Action
			// Check if it has a script or just standard behavior
			// If Script is present, use it.

			verb := model.Verb(node.Verb)

			// Mapping "to", "with", "where" which might be empty or specific IDs
			// If empty, they might mean NOTHING or specific defaults?
			// model.NOTHING consts are "nothing", etc.

			to := node.To
			if to == "" {
				to = model.NOTHING
			}
			with := node.With
			if with == "" {
				with = model.NOTHING
			}
			where := node.Where
			if where == "" {
				where = model.SOMEWHERE
			} // Or current location?

			// However, `node.From` is usually the Subject (Character or Item?)

			action := model.NewAction(
				node.From,
				verb,
				to,
				with,
				where,
				node.Script,
				model.DoNothing, // ExecBefore
				model.DoNothing, // ExecAction (runtime logic handles this if no script?)
				model.DoNothing, // ExecAfter
			)
			g.AddAction(action)
		}
	}

	// 6. Fonts
	for _, f := range pkgData.Fonts {
		if f.Details != nil && f.Details.FontFileUrl != "" {
			fontBytes, err := decodeBase64(f.Details.FontFileUrl)
			if err != nil {
				log.Printf("Error decoding font %s: %v", f.Name, err)
				continue
			}
			g.AddFont(f.ID, fontBytes) // Assuming ID is the name we use for referencing
		}
	}

	// 7. Cursors
	for _, c := range pkgData.Cursors {
		if c.Details != nil {
			var animations [][]byte
			for _, anim := range c.Details.Animations {
				b, err := decodeBase64(anim.Frames[0].ImageData)
				if err != nil {
					log.Printf("Error decoding animation frame for cursor %s: %v", c.Name, err)
					continue
				}
				animations = append(animations, b)
			}
			g.AddCursor(c.Name, animations[0])
		}
	}

	return nil
}

func decodeBase64(data string) ([]byte, error) {
	// Handle data:image/png;base64, prefix if present
	if strings.Contains(data, ",") {
		parts := strings.Split(data, ",")
		if len(parts) > 1 {
			data = parts[1]
		}
	}
	return base64.StdEncoding.DecodeString(data)
}
