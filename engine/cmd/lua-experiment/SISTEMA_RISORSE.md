# 🎮 Sistema di Gestione Risorse Dinamico

## ✨ Caratteristiche Principali

Il sistema permette di gestire dinamicamente risorse come font, immagini e cursori tramite script Lua, offrendo:

- **Caricamento dinamico** di font con diverse dimensioni
- **Gestione cursori** con tutti i tipi supportati da Ebiten
- **Configurazione JSON** per definire le risorse
- **Thread-safety** per uso sicuro in ambiente multi-goroutine
- **Fallback automatico** se le risorse non sono disponibili

## 🔧 Funzioni Lua Disponibili

### `setFont(nome)`
Cambia il font corrente per il rendering del testo.
```lua
setFont("title")    -- Font grande per titoli
setFont("default")  -- Font normale
setFont("small")    -- Font piccolo per note
```

### `setCursor(nome)`
Cambia il cursore del mouse.
```lua
setCursor("pointer")    -- Mano per link/pulsanti
setCursor("crosshair")  -- Mirino per selezione
setCursor("text")       -- I-beam per editing testo
setCursor("default")    -- Cursore normale
```

### `listResources()`
Restituisce tutte le risorse caricate.
```lua
local res = listResources()
print("Font: " .. #res.fonts)
print("Immagini: " .. #res.images) 
print("Cursori: " .. #res.cursors)
```

## 📁 Struttura File

```
lua-scripts/
├── main_ebiten.go          # File principale con integrazione
├── resources.go            # Gestore risorse
├── resource_loader.go      # Caricatore da configurazione
├── resources.json          # Configurazione risorse
├── assets/
│   ├── fonts/             # File font (.ttf, .otf)
│   └── images/            # File immagini (.png, .jpg)
├── esempio_uso.lua         # Esempio pratico completo
├── test_resources.lua      # Test di tutte le funzionalità
└── README_RISORSE.md       # Documentazione dettagliata
```

## 🚀 Come Usare

1. **Configura le risorse** in `resources.json`
2. **Aggiungi i file** nelle directory `assets/`
3. **Usa le funzioni Lua** negli script:
   ```lua
   -- Cambia aspetto interfaccia
   setFont("title")
   setCursor("pointer")
   print("Interfaccia aggiornata!")
   ```

## 🎯 Esempi Pratici

### Interfaccia Dinamica
```lua
-- Titolo
setFont("title")
print("=== APPLICAZIONE ===")

-- Contenuto
setFont("default") 
print("Contenuto principale")

-- Note
setFont("small")
print("Note e dettagli")
```

### Feedback Visivo
```lua
-- Modalità editing
setCursor("text")
setFont("default")
print("Modalità editing attiva")

-- Modalità selezione  
setCursor("crosshair")
print("Seleziona un'area")

-- Modalità normale
setCursor("default")
```

## ⚙️ Configurazione Avanzata

Il file `resources.json` supporta:

```json
{
  "fonts": [
    {
      "name": "custom",
      "path": "assets/fonts/custom.ttf",
      "size": 28
    }
  ],
  "images": [
    {
      "name": "sprite",
      "path": "assets/images/sprite.png"
    }
  ]
}
```

## 🔄 Compilazione ed Esecuzione

```bash
# Compila il progetto
go build -o lua-resources .

# Esegui il programma
./lua-resources
```

Il sistema caricherà automaticamente le risorse e renderà disponibili le funzioni Lua per la gestione dinamica dell'interfaccia.

## 💡 Vantaggi

- **Flessibilità**: Cambia l'aspetto senza ricompilare
- **Modularità**: Risorse separate dalla logica
- **Semplicità**: API Lua intuitiva
- **Robustezza**: Gestione errori e fallback
- **Performance**: Caricamento ottimizzato delle risorse