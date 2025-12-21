-- Esempio pratico di utilizzo del sistema di gestione risorse

-- Funzione helper per mostrare le risorse disponibili
function mostraRisorse()
    local res = listResources()
    print("📦 Risorse caricate:")
    print("  Font: " .. table.concat(res.fonts, ", "))
    print("  Cursori: " .. table.concat(res.cursors, ", "))
    return res
end

-- Funzione per creare un'interfaccia semplice
function creaInterfaccia()
    print("\n🎨 CREAZIONE INTERFACCIA")
    
    -- Titolo con font grande
    setFont("title")
    setCursor("default")
    print("=== SISTEMA DI GESTIONE RISORSE ===")
    
    wait(60)
    
    -- Sottotitolo con font normale
    setFont("default")
    print("Benvenuto nel sistema dinamico!")
    
    wait(60)
    
    -- Note con font piccolo
    setFont("small")
    print("(Muovi il mouse per vedere i cursori)")
end

-- Funzione per demo interattiva cursori
function demoCursori()
    print("\n🖱️  DEMO CURSORI INTERATTIVI")
    
    local cursori = {"pointer", "crosshair", "text", "ew-resize", "ns-resize"}
    
    for i, cursore in ipairs(cursori) do
        setFont("default")
        print("Cursore: " .. cursore)
        setCursor(cursore)
        wait(90)
    end
    
    setCursor("default")
    print("Demo cursori completata")
end

-- Funzione per demo font dinamici
function demoFont()
    print("\n📝 DEMO FONT DINAMICI")
    
    local messaggi = {
        {font = "title", testo = "TITOLO PRINCIPALE"},
        {font = "default", testo = "Testo normale per il corpo"},
        {font = "small", testo = "note e dettagli in piccolo"}
    }
    
    for i, msg in ipairs(messaggi) do
        setFont(msg.font)
        print(msg.testo)
        wait(90)
    end
end

-- Esecuzione principale
print("🚀 AVVIO ESEMPIO COMPLETO")

-- Mostra risorse disponibili
mostraRisorse()

wait(120)

-- Crea interfaccia
creaInterfaccia()

wait(120)

-- Demo cursori
demoCursori()

wait(120)

-- Demo font
demoFont()

wait(120)

-- Ripristino finale
print("\n🔄 RIPRISTINO SISTEMA")
setFont("default")
setCursor("default")
print("✅ Esempio completato - sistema ripristinato")

print("\n💡 SUGGERIMENTI:")
print("- Usa setFont() per cambiare il font del testo")
print("- Usa setCursor() per cambiare il cursore del mouse")  
print("- Usa listResources() per vedere le risorse disponibili")
print("- Modifica resources.json per aggiungere nuove risorse")