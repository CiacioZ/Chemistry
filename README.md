# Chemistry Project

This repository contains the "Chemistry" project, which includes a scenario editor and potentially other backend components.

## Project Structure

The project is organized as follows:

-   `/editor`: Contains the frontend application developed in Next.js, used for visual editing of scenarios, locations, items, characters, and dialogues.
-   `/engine`: Contains the game engine and backend services, developed in Go.
-   Other files and folders supporting the main project.

## Main Components

### 1. Scenario Editor (Frontend - Next.js)

The editor is a web application that allows you to:
-   Create and manage entities such as Locations, Items, Characters.
-   Define the properties and details of each entity.
-   View and modify a flowchart representing game/scenario interactions and logic.
-   Place objects and characters within locations.
-   Define polygonal areas (walkable areas, interaction spots) on location images.

### 2. Game Engine and Backend (Application Services - Go)

The game engine, located in the `/engine` folder, is responsible for:
-   Managing the game's business logic.
-   Executing the game script and interactions.
-   Saving and retrieving project data (scenarios, entities, etc.).
-   Providing APIs for the frontend editor (if applicable) or directly managing the game state.

## Prerequisites

Before you begin, ensure you have installed:

-   **Node.js** (for the Next.js editor): Version 18.x or later recommended. You can download it from [nodejs.org](https://nodejs.org/).
-   **Go** (for the backend, if applicable): Version 1.x. You can download it from [golang.org](https://go.dev/dl/).
-   **npm, yarn, pnpm, or bun** (for managing editor packages).

## How to Start the Project

### Starting the Editor (Frontend Next.js)

1.  Navigate to the editor folder:
    ```bash
    cd editor
    ```
2.  Install dependencies (run only once):
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
    ```
3.  Start the editor's development server:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the editor.

### Starting the Game Engine (Backend Go)

1.  Navigate to the engine folder:
    ```bash
    cd engine
    ```
2.  Run the command to start the Go application (this may vary depending on how the backend is structured, e.g., for a desktop or web application):
    ```bash
    # Example for a desktop application (could be in engine/cmd/desktop)
    go run cmd/desktop/main.go
    # or for a web service (could be in engine/cmd/web)
    # go run cmd/web/web.go
    # or another command specific to your backend project
    ```
    Be sure to consult the specific backend documentation or the command structure within the `/engine/cmd/` folder for the exact commands.

## Contributing

Information on how to contribute to the project (to be defined).

## License

Details on the project license (to be defined).