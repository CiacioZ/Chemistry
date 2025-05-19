# Progetto Chemistry

Questo repository contiene il progetto "Chemistry", che include un editor di scenari e potenzialmente altri componenti backend.

## Struttura del Progetto

Il progetto è organizzato come segue:

-   `/editor`: Contiene l'applicazione frontend sviluppata in Next.js, utilizzata per l'editing visuale di scenari, location, item, personaggi e dialoghi.
-   `/engine`: Contiene l'engine di gioco e i servizi backend, sviluppati in Go.
-   Altri file e cartelle di supporto al progetto principale.

## Componenti Principali

### 1. Editor di Scenari (Frontend - Next.js)

L'editor è un'applicazione web che permette di:
-   Creare e gestire entità come Location, Item, Personaggi.
-   Definire le proprietà e i dettagli di ciascuna entità.
-   Visualizzare e modificare un diagramma di flusso che rappresenta le interazioni e la logica del gioco/scenario.
-   Posizionare oggetti e personaggi all'interno delle location.
-   Definire aree poligonali (walkable areas, interaction spots) sulle immagini delle location.

### 2. Engine di Gioco e Backend (Servizi Applicativi - Go)

L'engine di gioco, situato nella cartella `/engine`, è responsabile di:
-   Gestire la logica di business del gioco.
-   Eseguire lo script di gioco e le interazioni.
-   Salvare e recuperare i dati del progetto (scenari, entità, ecc.).
-   Fornire API per l'editor frontend (se applicabile) o gestire direttamente lo stato del gioco.

## Prerequisiti

Prima di iniziare, assicurati di avere installato:

-   **Node.js** (per l'editor Next.js): Versione 18.x o successiva raccomandata. Puoi scaricarlo da [nodejs.org](https://nodejs.org/).
-   **Go** (per il backend, se applicabile): Versione 1.x. Puoi scaricarlo da [golang.org](https://go.dev/dl/).
-   **npm, yarn, pnpm, o bun** (per la gestione dei pacchetti dell'editor).

## Come Avviare il Progetto

### Avviare l'Editor (Frontend Next.js)

1.  Naviga nella cartella dell'editor:
    ```bash
    cd editor
    ```
2.  Installa le dipendenze (esegui solo una volta):
    ```bash
    npm install
    # o
    yarn install
    # o
    pnpm install
    # o
    bun install
    ```
3.  Avvia il server di sviluppo dell'editor:
    ```bash
    npm run dev
    # o
    yarn dev
    # o
    pnpm dev
    # o
    bun dev
    ```
4.  Apri [http://localhost:3000](http://localhost:3000) nel tuo browser per vedere l'editor.

### Avviare l'Engine di Gioco (Backend Go)

1.  Naviga nella cartella dell'engine:
    ```bash
    cd engine
    ```
2.  Esegui il comando per avviare l'applicazione Go (questo può variare a seconda di come è strutturato il backend, ad esempio per un'applicazione desktop o web):
    ```bash
    # Esempio per un'applicazione desktop (potrebbe essere in engine/cmd/desktop)
    go run cmd/desktop/main.go
    # o per un servizio web (potrebbe essere in engine/cmd/web)
    # go run cmd/web/web.go
    # o un altro comando specifico del tuo progetto backend
    ```
    Assicurati di consultare la documentazione specifica del backend o la struttura dei comandi all'interno della cartella `/engine/cmd/` per i comandi esatti.

## Contribuire

Informazioni su come contribuire al progetto (da definire).

## Licenza

Dettagli sulla licenza del progetto (da definire).