# Sistema di Coordinate - Editor vs Engine

## Problema Identificato

L'editor e l'engine usano sistemi di coordinate diversi per posizionare gli oggetti:

### Editor (PlacementEditor.tsx)
- Salva coordinate come **pixel assoluti** rispetto all'immagine naturale
- Applica `transform: 'translate(-50%, -50%)'` per centrare l'oggetto sul punto
- Le coordinate salvate rappresentano il **centro** dell'oggetto

### Engine (loop.go - drawItem)
- Usa le coordinate direttamente senza trasformazioni
- Le coordinate rappresentano l'**angolo in alto a sinistra** dell'oggetto
- Non applica alcun offset di centratura

## Soluzione

Ci sono due approcci possibili:

### Opzione 1: Modificare l'Editor (CONSIGLIATO)
Salvare le coordinate come angolo in alto a sinistra invece del centro.

### Opzione 2: Modificare l'Engine
Applicare l'offset di centratura nell'engine quando disegna gli oggetti.

## Implementazione Consigliata

Modificare l'editor per salvare coordinate compatibili con l'engine.
