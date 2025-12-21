# Sistema di Gestione Risorse Dinamico

## Panoramica
Il sistema permette di gestire dinamicamente risorse come font, immagini e cursori tramite script Lua.

## Funzioni Lua Disponibili

### `setFont(nome)`
Imposta il font corrente per il rendering del testo.
```lua
setFont("title")  -- Usa il font "title"
setFont("small")  -- Usa il font "small"
```

### `setCursor(nome)`
Imposta il cursore del mouse.
```lua
setCursor("pointer")    -- Cursore a puntatore
setCursor("crosshair")  -- Cursore a mirino
setCursor("text")       -- Cursore per testo
setCursor("default")    -- Cursore di default
```

### `listResources()`
Restituisce una tabella con tutte le risorse disponibili.
```lua
local resources = listResources()
print("Font disponibili: " .. #resources.fonts)
print("Immagini disponibili: " .. #resources.images)
print("Cursori disponibili: " .. #resources.cursors)
```

## Configurazione Risorse

Le risorse sono definite nel file `resources.json`:

```json
{
  "fonts": [
    {
      "name": "default",
      "path": "assets/fonts/font.ttf",
      "size": 24
    }
  ],
  "images": [
    {
      "name": "logo",
      "path": "assets/images/logo.png"
    }
  ]
}
```

## Cursori Predefiniti

Il sistema include questi cursori:
- `default` - Cursore normale
- `text` - Cursore per testo
- `crosshair` - Mirino
- `pointer` - Puntatore
- `ew-resize` - Ridimensionamento orizzontale
- `ns-resize` - Ridimensionamento verticale

## Struttura Directory

```
assets/
├── fonts/          # File font (.ttf, .otf)
└── images/         # File immagini (.png, .jpg, .gif)
```

## Esempio Completo

```lua
-- Elenca risorse
local resources = listResources()
print("Risorse caricate:")
for i = 1, #resources.fonts do
    print("Font: " .. resources.fonts[i])
end

-- Cambia font
setFont("title")
print("Testo con font grande")

-- Cambia cursore
setCursor("pointer")
wait(60)  -- Aspetta 1 secondo

-- Torna ai default
setFont("default")
setCursor("default")
```

## Note Tecniche

- I font vengono caricati all'avvio del programma
- Se un file di risorsa non esiste, viene usato un fallback
- Le modifiche alle risorse sono thread-safe
- Il sistema supporta hot-reload modificando `resources.json`