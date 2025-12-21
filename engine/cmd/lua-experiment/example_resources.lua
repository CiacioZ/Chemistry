-- Esempio di utilizzo del sistema di gestione risorse

print("=== DEMO GESTIONE RISORSE ===")

-- Elenca tutte le risorse disponibili
print("Elenco risorse disponibili:")
local resources = listResources()

print("Font disponibili:")
for i = 1, #resources.fonts do
    print("  - " .. resources.fonts[i])
end

print("Immagini disponibili:")
for i = 1, #resources.images do
    print("  - " .. resources.images[i])
end

print("Cursori disponibili:")
for i = 1, #resources.cursors do
    print("  - " .. resources.cursors[i])
end

-- Cambia font
print("\n=== TEST CAMBIO FONT ===")
print("Cambio al font 'title'...")
setFont("title")
print("Questo testo dovrebbe essere più grande!")

wait(120) -- Aspetta 2 secondi

print("Cambio al font 'small'...")
setFont("small")
print("Questo testo dovrebbe essere più piccolo!")

wait(120)

print("Torno al font 'default'...")
setFont("default")
print("Testo normale")

-- Cambia cursore
print("\n=== TEST CAMBIO CURSORE ===")
print("Cambio cursore a 'pointer'...")
setCursor("pointer")

wait(120)

print("Cambio cursore a 'crosshair'...")
setCursor("crosshair")

wait(120)

print("Cambio cursore a 'text'...")
setCursor("text")

wait(120)

print("Torno al cursore 'default'...")
setCursor("default")

print("\n=== DEMO COMPLETATA ===")