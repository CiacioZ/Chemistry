-- Test completo del sistema di gestione risorse

print("🎮 AVVIO TEST SISTEMA RISORSE")

-- 1. Elenca tutte le risorse disponibili
print("\n📋 RISORSE DISPONIBILI:")
local resources = listResources()

print("📝 Font (" .. #resources.fonts .. "):")
for i = 1, #resources.fonts do
    print("  • " .. resources.fonts[i])
end

print("🖼️  Immagini (" .. #resources.images .. "):")
for i = 1, #resources.images do
    print("  • " .. resources.images[i])
end

print("🖱️  Cursori (" .. #resources.cursors .. "):")
for i = 1, #resources.cursors do
    print("  • " .. resources.cursors[i])
end

-- 2. Test cambio font
print("\n🔤 TEST CAMBIO FONT")
print("Font corrente: default")

wait(60)
print("Cambio a font 'title' (grande)...")
setFont("title")
print("QUESTO TESTO DOVREBBE ESSERE PIÙ GRANDE!")

wait(120)
print("Cambio a font 'small' (piccolo)...")
setFont("small")
print("questo testo dovrebbe essere più piccolo")

wait(120)
print("Torno al font 'default'...")
setFont("default")
print("Testo normale ripristinato")

-- 3. Test cambio cursore
print("\n🖱️  TEST CAMBIO CURSORE")

print("Cursore: pointer (mano)")
setCursor("pointer")
wait(90)

print("Cursore: crosshair (mirino)")
setCursor("crosshair")
wait(90)

print("Cursore: text (I-beam)")
setCursor("text")
wait(90)

print("Cursore: ew-resize (ridimensiona orizzontale)")
setCursor("ew-resize")
wait(90)

print("Cursore: ns-resize (ridimensiona verticale)")
setCursor("ns-resize")
wait(90)

print("Torno al cursore default")
setCursor("default")

-- 4. Test combinato
print("\n🎯 TEST COMBINATO")
print("Font grande + cursore pointer")
setFont("title")
setCursor("pointer")
print("COMBINAZIONE ATTIVA!")

wait(120)

print("Font piccolo + cursore crosshair")
setFont("small")
setCursor("crosshair")
print("nuova combinazione attiva")

wait(120)

-- 5. Ripristino defaults
print("\n🔄 RIPRISTINO DEFAULTS")
setFont("default")
setCursor("default")
print("Sistema ripristinato ai valori di default")

print("\n✅ TEST COMPLETATO CON SUCCESSO!")