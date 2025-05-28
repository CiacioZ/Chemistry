"use client"; // Aggiunto per usare hooks

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importato useRouter
import { DiagramProvider, useDiagramContext } from '../components/flow-diagram/contexts/DiagramContext'; // Import useDiagramContext
import FlowDiagram from '../components/flow-diagram/FlowDiagram'; // Default import
import { CharacterEditor } from '../components/entity-editor/CharacterEditor';
import { ItemEditor } from '../components/entity-editor/ItemEditor';
import { LocationEditor } from '../components/entity-editor/LocationEditor';
import { PolygonEditor } from '../components/entity-editor/PolygonEditor';
import { PlacementEditor } from '../components/entity-editor/PlacementEditor';
import { FontEditor } from '../components/entity-editor/FontEditor';
import { ScriptEditor } from '../components/entity-editor/ScriptEditor';
import { loadDiagram } from '../components/flow-diagram/utils/saveLoad'; // Importato loadDiagram
import { ItemEntity, CharacterEntity, LocationEntity, LocationDetails } from '../components/flow-diagram/types/index'; // Corrected path and added LocationEntity, LocationDetails

// Definizione dei tab disponibili
const TABS = [
  { id: 'characters', label: 'Characters' },
  { id: 'items', label: 'Items' },
  { id: 'locations', label: 'Locations' },
  { id: 'polygons', label: 'Location Polygons' }, 
  { id: 'placement', label: 'Location Placement'},
  { id: 'fonts', label: 'Fonts' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'flow', label: 'Flow Diagram' },
];

// Inner component to access context after provider
const EditorTabs: React.FC = () => {
  const router = useRouter(); // Hook per la navigazione
  const { pushNodes, setProjectName, entities, setEntities } = useDiagramContext(); // Ottieni funzioni dal context
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  
  // Placeholder for a selected location ID to be used by Polygon and Placement editors
  // This would ideally be set by the LocationEditor or a similar mechanism
  const [activeLocationForSubEditing, setActiveLocationForSubEditing] = useState<string | null>(null);

  // Funzione per gestire il caricamento del file
  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    loadDiagram(
      file,
      (loadedNodes, loadedProjectName, loadedEntities) => {
        // Aggiorna lo stato globale con i dati caricati
        pushNodes(loadedNodes);
        setProjectName(loadedProjectName);
        setEntities(loadedEntities);
        // Potentially reset activeLocationForSubEditing if project changes
        setActiveLocationForSubEditing(null); 
        // Reindirizza all'editor dopo il caricamento
        router.push('/editor'); // Modificato da '/entities'
      },
      (error) => {
        // Mostra un messaggio di errore se il caricamento fallisce
        alert('Errore nel caricamento del progetto: ' + error);
      }
    );

    // Resetta il valore dell'input per permettere di caricare lo stesso file di nuovo
    event.target.value = '';
  };

  // Callback for LocationEditor to set the active location for sub-editing
  const handleLocationSelectedForSubEditing = (locationId: string | null) => {
    setActiveLocationForSubEditing(locationId);
    // If a location is selected, and the user is not on polygons/placement, 
    // they might expect to switch to one of these tabs, or these tabs become enabled.
    // For now, just setting the ID.
  };

  const renderActiveTabContent = () => {
    const locationEditorActualProps = {
        setEntities: setEntities,
        // Pass the callback to LocationEditor
        onLocationSelectedForSubEditing: handleLocationSelectedForSubEditing, 
    };

    const allItems = entities.filter(e => e.type === 'Item') as ItemEntity[];
    const allCharacters = entities.filter(e => e.type === 'Character') as CharacterEntity[];

    switch (activeTab) {
      case 'characters':
        return <CharacterEditor />;
      case 'items':
        return <ItemEditor />;
      case 'locations':
        return <LocationEditor {...locationEditorActualProps} />;
      case 'polygons':
        if (!activeLocationForSubEditing) {
          return <div className="text-center p-4">Please select a location via the 'Locations' tab first, then return here to edit its polygons.</div>;
        }
        const selectedLocationForPolygon = entities.find(e => e.id === activeLocationForSubEditing && e.type === 'Location') as LocationEntity | undefined;
        const polygonEditorProps = {
            locationId: activeLocationForSubEditing,
            entities: entities,
            setEntities: setEntities,
            initialImageUrlFromEntity: selectedLocationForPolygon?.details?.backgroundImage,
            initialPolygonsFromEntity: selectedLocationForPolygon?.details?.polygons, 
        };
        return <PolygonEditor {...polygonEditorProps} />;
      case 'placement':
        if (!activeLocationForSubEditing) {
          return <div className="text-center p-4">Please select a location via the 'Locations' tab first, then return here to edit its placements.</div>;
        }
        const selectedLocationForPlacement = entities.find(e => e.id === activeLocationForSubEditing && e.type === 'Location') as LocationEntity | undefined;
        const placementEditorProps = {
            locationId: activeLocationForSubEditing,
            entities: entities,
            setEntities: setEntities,
            locationImageUrl: selectedLocationForPlacement?.details?.backgroundImage || null, 
            initialPlacedObjects: (selectedLocationForPlacement?.details as LocationDetails)?.placedItems || [],
            initialPlacedCharacters: (selectedLocationForPlacement?.details as LocationDetails)?.placedCharacters || [],
            allItems: allItems,
            allCharacters: allCharacters,
        };
        return <PlacementEditor {...placementEditorProps} />;
      case 'fonts':
        return <FontEditor />;
      case 'scripts':
        return <ScriptEditor />;
      case 'flow':
        return <FlowDiagram />;
      default:
        return <div>Select a tab</div>;
    }
  };
  
  const activeTabContent = useMemo(() => renderActiveTabContent(), [activeTab, entities, setEntities, activeLocationForSubEditing]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Tab Navigation & Load Button */}
      <div className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-2 sm:px-4 flex justify-between items-center">
            <nav className="flex space-x-1 overflow-x-auto py-1">
            {TABS.map(tab => (
                <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-3 sm:px-4 py-2 sm:py-3 font-medium text-sm leading-5 rounded-t-md 
                            focus:outline-none 
                            ${activeTab === tab.id 
                                ? 'text-blue-700 dark:text-blue-300 border-b-2 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-gray-700' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                >
                {tab.label}
                </button>
            ))}
            </nav>
            <div className="ml-auto pl-2 py-2">
                <label className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded text-sm cursor-pointer whitespace-nowrap">
                    Load Project
                    <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
                </label>
            </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow p-4 overflow-auto">
        {activeTabContent}
      </div>
    </div>
  );
};

const EditorPage: React.FC = () => {
  return (
    <DiagramProvider>
      <EditorTabs />
    </DiagramProvider>
  );
};

export default EditorPage;

// Rimuovi tutto il codice sottostante che definiva il vecchio componente 'App'
// import { DiagramProvider } from '../components/flow-diagram/contexts/DiagramContext';
// import FlowDiagram from '../components/flow-diagram/FlowDiagram';
//
// const App = () => {
//   return (
//     // Contenitore principale per layout
//     <div className="relative min-h-screen">
//        {/* Bottone per andare all'editor posizionato in alto a destra */}
//        <div className="absolute top-4 right-4 z-20">
//          <Link href="/entities">
//            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
//              Vai all'Editor Entità
//            </button>
//          </Link>
//        </div>
//
//        {/* Contenuto originale del diagramma */}
//        <DiagramProvider>
//          <FlowDiagram />
//        </DiagramProvider>
//     </div>
//   );
// };
//
// export default App; // Rimosso questo secondo export default