package logic

import (
	"chemistry/engine/model"
	"image"
	"log"
)

// mapPackagedDataIndex maps the packaged data index without loading binary resources
func (g *Game) mapPackagedDataIndex(pkgData PackagedGameData) error {
	// 1. Locations (structure only)
	for _, l := range pkgData.Locations {
		location := model.NewLocation(l.ID, l.Name, nil) // No background loaded yet

		if l.Details != nil {
			// Walkable Areas
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

	// 2. Characters (structure only)
	for _, c := range pkgData.Characters {
		char := model.NewCharacter(c.ID, c.Name, model.Color{R: 255, G: 255, B: 255})
		g.AddCharacter(char)
	}

	// 3. Items (structure only)
	for _, i := range pkgData.Items {
		pickable := false
		useWith := false
		if i.Details != nil {
			pickable = i.Details.CanBePickedUp
			useWith = i.Details.UseWith
		}

		item := model.NewItem(i.ID, i.Name, useWith, pickable, nil) // No sprite loaded yet
		g.AddItem(item)
	}

	// 4. Actions from Diagram Nodes
	for _, node := range pkgData.DiagramNodes {
		switch node.Type {
		case "action":
			verb := model.Verb(node.Verb)

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
			}

			action := model.NewAction(
				node.From,
				verb,
				to,
				with,
				where,
				node.Script,
				model.DoNothing,
				model.DoNothing,
				model.DoNothing,
			)
			g.AddAction(action)
		case "state":
			if node.Label == "Initial state" {
				for _, flag := range node.Flags {
					g.SetFlag(flag.Name, flag.Value)
				}
			}
		}
	}

	// 5. Fonts (structure only)
	for _, f := range pkgData.Fonts {
		g.data.Fonts[f.Name] = nil // Placeholder, loaded on-demand
	}

	// 6. Scripts (structure only)
	for _, s := range pkgData.Scripts {
		g.data.Scripts[s.Name] = "" // Placeholder, loaded on-demand
	}

	// 7. Cursors (structure only)
	for _, c := range pkgData.Cursors {
		g.data.Cursors[c.Name] = nil // Placeholder, loaded on-demand
	}

	return nil
}

// LoadLocationBackground loads location background on-demand
func (g *Game) LoadLocationBackground(locationID string) error {
	for _, l := range g.packagedData.Locations {
		if l.Name == locationID && l.Details != nil && l.Details.BackgroundRef != nil {
			data, err := g.resourceManager.LoadBinaryData(l.Details.BackgroundRef)
			if err != nil {
				return err
			}
			// Update location with background
			location := g.GetLocation(locationID)
			location.SetBackground(data)
			break
		}
	}
	return nil
}

// LoadCharacterAnimations loads character animations on-demand
func (g *Game) LoadCharacterAnimations(characterID string) error {
	for _, c := range g.packagedData.Characters {
		if c.Name == characterID && c.Details != nil {
			char := g.GetCharacter(characterID)
			for _, anim := range c.Details.Animations {
				var frames [][]byte
				for _, frame := range anim.Frames {
					if frame.ImageRef != nil {
						data, err := g.resourceManager.LoadBinaryData(frame.ImageRef)
						if err != nil {
							log.Printf("Error loading animation frame: %v", err)
							continue
						}
						frames = append(frames, data)
					}
				}
				if len(frames) > 0 {
					char.Animations[anim.Name] = frames
				}
			}
			break
		}
	}
	return nil
}

// LoadItemSprite loads item sprite on-demand
func (g *Game) LoadItemSprite(itemID string) error {
	for _, i := range g.packagedData.Items {
		if i.ID == itemID && i.Details != nil && i.Details.ImageRef != nil {
			data, err := g.resourceManager.LoadBinaryData(i.Details.ImageRef)
			if err != nil {
				return err
			}
			item := g.data.Items[itemID]
			item.Image = data
			g.data.Items[itemID] = item
			break
		}
	}
	return nil
}

// LoadFont loads font on-demand
func (g *Game) LoadFont(fontName string) error {
	for _, f := range g.packagedData.Fonts {
		if f.Name == fontName && f.Details != nil && f.Details.FontRef != nil {
			data, err := g.resourceManager.LoadBinaryData(f.Details.FontRef)
			if err != nil {
				return err
			}
			g.AddFont(f.Name, data)
			break
		}
	}
	return nil
}

// LoadScript loads script on-demand
func (g *Game) LoadScript(scriptName string) error {
	for _, s := range g.packagedData.Scripts {
		if s.Name == scriptName && s.Details != nil && s.Details.ScriptRef != nil {
			data, err := g.resourceManager.LoadBinaryData(s.Details.ScriptRef)
			if err != nil {
				return err
			}
			g.AddScript(s.Name, string(data))
			break
		}
	}
	return nil
}

// LoadCursor loads cursor on-demand
func (g *Game) LoadCursor(cursorName string) error {
	for _, c := range g.packagedData.Cursors {
		if c.Name == cursorName && c.Details != nil && len(c.Details.Animations) > 0 {
			anim := c.Details.Animations[0]
			if len(anim.Frames) > 0 && anim.Frames[0].ImageRef != nil {
				data, err := g.resourceManager.LoadBinaryData(anim.Frames[0].ImageRef)
				if err != nil {
					return err
				}
				g.AddCursor(c.Name, data)
			}
			break
		}
	}
	return nil
}
