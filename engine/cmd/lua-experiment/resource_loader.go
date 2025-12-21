package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/hajimehoshi/ebiten/v2/examples/resources/fonts"
)

// ResourceConfig rappresenta la configurazione delle risorse
type ResourceConfig struct {
	Fonts  []FontConfig  `json:"fonts"`
	Images []ImageConfig `json:"images"`
}

type FontConfig struct {
	Name string  `json:"name"`
	Path string  `json:"path"`
	Size float64 `json:"size"`
}

type ImageConfig struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// LoadResourcesFromConfig carica le risorse dal file di configurazione
func LoadResourcesFromConfig(rm *ResourceManager, configPath string) error {
	// Leggi il file di configurazione
	configData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("errore nella lettura del file di configurazione: %v", err)
	}

	var config ResourceConfig
	if err := json.Unmarshal(configData, &config); err != nil {
		return fmt.Errorf("errore nel parsing del file di configurazione: %v", err)
	}

	// Carica i font
	for _, fontConfig := range config.Fonts {
		var fontData []byte

		// Se il path non esiste, usa il font di default
		if _, err := os.Stat(fontConfig.Path); os.IsNotExist(err) {
			fontData = fonts.MPlus1pRegular_ttf
		} else {
			fontData, err = os.ReadFile(fontConfig.Path)
			if err != nil {
				return fmt.Errorf("errore nel caricamento del font %s: %v", fontConfig.Name, err)
			}
		}

		if err := rm.LoadFont(fontConfig.Name, fontData, fontConfig.Size); err != nil {
			return err
		}
	}

	// Carica le immagini
	for _, imageConfig := range config.Images {
		// Controlla se il file esiste
		if _, err := os.Stat(imageConfig.Path); os.IsNotExist(err) {
			fmt.Printf("Avviso: Immagine %s non trovata in %s, saltata\n", imageConfig.Name, imageConfig.Path)
			continue
		}

		imageData, err := os.ReadFile(imageConfig.Path)
		if err != nil {
			return fmt.Errorf("errore nel caricamento dell'immagine %s: %v", imageConfig.Name, err)
		}

		if err := rm.LoadImage(imageConfig.Name, imageData); err != nil {
			return err
		}
	}

	return nil
}

// CreateDefaultResourceConfig crea un file di configurazione di default
func CreateDefaultResourceConfig(configPath string) error {
	config := ResourceConfig{
		Fonts: []FontConfig{
			{Name: "default", Path: "assets/fonts/default.ttf", Size: 24},
			{Name: "title", Path: "assets/fonts/default.ttf", Size: 36},
			{Name: "small", Path: "assets/fonts/default.ttf", Size: 16},
		},
		Images: []ImageConfig{
			{Name: "logo", Path: "assets/images/logo.png"},
			{Name: "background", Path: "assets/images/background.png"},
		},
	}

	// Crea la directory se non esiste
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("errore nella creazione della directory: %v", err)
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("errore nella serializzazione della configurazione: %v", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("errore nella scrittura del file di configurazione: %v", err)
	}

	return nil
}
