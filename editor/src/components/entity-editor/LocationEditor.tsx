'use client';

import React, { useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction, useRef } from 'react'; // Added useRef
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, LocationEntity, ItemEntity, CharacterEntity } from '../flow-diagram/types/index'; // Importa ItemEntity e CharacterEntity
import { PolygonEditor } from './PolygonEditor';
import { PlacementEditor } from './PlacementEditor'; // Assicurati che questo import sia corretto
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Interface for the detailed location data used in the form
interface LocationData {
  id: string; // Corresponds to Entity.value
  name: string; // Initially same as Entity.value, can be edited
  description: string;
  background: string;
  // Aggiungere altri campi come WalkableAreas, Items, etc.
  placedObjects?: Array<{ entityId: string; x: number; y: number }>; // Esempio per oggetti piazzati
  placedCharacters?: Array<{ entityId: string; x: number; y: number }>; // Esempio per personaggi piazzati
}

interface LocationEditorProps { // Aggiunta interfaccia Props
  imageUploadService?: (file: File) => Promise<string>;
  setEntities: Dispatch<SetStateAction<Entity[]>>; // MODIFICATO
}

// Definiamo i tipi per le modalità di editing
type EditorMode = 'polygons' | 'placement';

export const LocationEditor: React.FC<LocationEditorProps> = ({ imageUploadService }) => {
  const { entities, setEntities } = useDiagramContext(); // Get setEntities

  // Derive the list of location entities directly from the context
  const graphLocations = useMemo(() => {
    return entities.filter((entity): entity is LocationEntity => // Use LocationEntity type guard
        entity.type === 'Location' && entity.internal === false
    );
  }, [entities]);

  // State for the ID (value) of the selected location entity
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  // State for the detailed form data (using LocationData interface)
  const [formData, setFormData] = useState<Partial<LocationData>>({});
  // Stato per la modalità di editing corrente
  const [editorMode, setEditorMode] = useState<EditorMode>('polygons');
  const isInitialDataLoad = useRef(false);

  useEffect(() => {
    if (selectedLocationId) {
      const selectedEntity = graphLocations.find(loc => loc.id === selectedLocationId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        const details = selectedEntity.details || {};
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          description: details.description || '',
          background: details.backgroundImage || '',
        });
      } else {
        setSelectedLocationId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedLocationId, graphLocations]); // graphLocations depends on entities, so this effect re-runs if entities change elsewhere

  // Auto-save for name and description
  useEffect(() => {
    if (isInitialDataLoad.current) {
        isInitialDataLoad.current = false;
        return;
    }
    // Ensure formData.name is defined before trying to save. formData.description can be empty.
    if (!selectedLocationId || !formData.id || typeof formData.name === 'undefined') { 
        return;
    }

    const locationIdToUpdate = selectedLocationId;

    setEntities(prevEntities => {
        let entityActuallyChanged = false; // Flag to track if the specific location entity was changed
        const updatedEntities = prevEntities.map(entity => {
            if (entity.id === locationIdToUpdate && entity.type === 'Location') {
                const locEntity = entity as LocationEntity;
                const currentDetails = locEntity.details || {};
                // Ensure formData.name and formData.description are treated as empty strings if null/undefined for comparison & assignment
                const newName = formData.name || ''; 
                const newDescription = formData.description || '';

                const currentName = locEntity.name || '';
                const currentDesc = currentDetails.description || '';

                // Only proceed if name or description has actually changed
                if (currentName !== newName || currentDesc !== newDescription) {
                    // Name conflict check: only if the name is actually changing to something new
                    if (currentName !== newName) {
                        const isNameTaken = prevEntities.some(e => 
                            e.type === 'Location' && 
                            e.name === newName && 
                            e.id !== locationIdToUpdate
                        );
                        if (isNameTaken) {
                            // console.warn(`Location name "${newName}" is already in use. Update skipped.`);
                            // If name is taken, do not update this entity, return original.
                            // Also, consider reverting formData.name here to avoid user confusion or trigger a UI warning.
                            // For now, just skip update for this entity.
                            return locEntity; 
                        }
                    }
                    
                    entityActuallyChanged = true; // Mark that this entity will be changed
                    return {
                        ...locEntity,
                        name: newName,
                        details: {
                            ...currentDetails,
                            description: newDescription,
                        },
                    } as LocationEntity;
                }
                return locEntity; // Return original if no change to this specific entity
            }
            return entity;
        });

        // Only return a new array if the specific location entity was actually changed
        if (entityActuallyChanged) {
            return updatedEntities;
        }
        return prevEntities; // Return original array reference if no entity was modified
    });
  }, [formData.name, formData.description, selectedLocationId, setEntities]);

  // Handler for form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    // TODO: Implement logic to save changes back (e.g., update details associated with formData.id)
  };

  // Handler for selecting a location from the list
  const handleSelectLocation = (id: string) => {
    setSelectedLocationId(id);
    setEditorMode('polygons'); // Reset to default editor mode on selection
  };

  const handleCreateLocation = () => {
    const newGuid = uuidv4();
    const baseNewName = "NewLocation";
    let newName = baseNewName;
    let counter = 1;
    while (entities.some(e => e.name === newName && e.type === 'Location')) {
        newName = `${baseNewName}_${counter}`;
        counter++;
    }

    const newLocation: LocationEntity = {
        id: newGuid,
        type: 'Location',
        name: newName,
        internal: false,
        details: {
            description: '',
            backgroundImage: null,
            walkableAreas: [],
            placedItems: [],
            placedCharacters: []
        }
    };
    setEntities(prevEntities => [...prevEntities, newLocation]);
    setSelectedLocationId(newGuid); // Select the new location by its GUID
    setEditorMode('polygons'); // Set to default edit mode
  };

  const handleDeleteLocation = useCallback((locationIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare la location? Questa azione non può essere annullata.`)) {
      // Calculate the new entities array by filtering out the item to delete
      const newEntities = entities.filter((entity: Entity) => entity.id !== locationIdToDelete);
      setEntities(newEntities); // Pass the new array directly

      if (selectedLocationId === locationIdToDelete) {
        setSelectedLocationId(null);
        setFormData({});
      }
      // Potresti voler mostrare una notifica di successo qui
    }
  }, [selectedLocationId, setEntities, entities]); 

  // TODO: Implement functions for saving changes, creating new locations (adding to entities), deleting locations (removing from entities)

  return (
    <div className="flex h-full space-x-4"> {/* Layout Flex per le due colonne */}

      {/* Colonna Sinistra: Lista delle Locations */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Locations</h3>
            <button 
                onClick={handleCreateLocation}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
                + New Location
            </button>
        </div>
        <ul>
          {/* Map over graphLocations (derived from entities) */}
          {graphLocations.map((loc) => (          
            <li
              // Use loc.id as the key, as it's the unique identifier from the Entity
              key={loc.id}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                // Compare selectedLocationId with loc.id
                selectedLocationId === loc.id ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectLocation(loc.id)} className="flex-grow"> {/* Pass GUID to select handler */}
              {loc.name}
              </span>

            <button
              onClick={(e) => {
                e.stopPropagation(); // Impedisce al click di propagarsi al li e selezionare l'item
                handleDeleteLocation(loc.id); // Pass GUID to delete handler
              }}
              className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 focus:outline-none"
              aria-label={`Delete ${loc.name}`}
              title={`Delete ${loc.name}`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>          
            </li>
          ))}
        </ul>
      </div> {/* Closing tag for the left column div */}

      {/* Colonna Destra: Form di Editing */}
      <div className="w-2/3 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Location Details</h2>
        {selectedLocationId ? (
          <>
            {/* Display basic Location Name and Description fields if a location is selected */}
            <div className="mb-4">
                <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location ID (GUID - Read-only)
                </label>
                <input
                    type="text"
                    id="locationId"
                    name="id"
                    value={formData.id || ''} // This is the GUID
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
                />
            </div>
            <div className="mb-4">
                <label htmlFor="locationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                </label>
                <input
                    type="text"
                    id="locationName"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange} // Assumes handleChange updates formData.name
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>
            <div className="mb-4">
                <label htmlFor="locationDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                </label>
                <textarea
                    id="locationDescription"
                    name="description"
                    rows={2} // Shorter description field for locations
                    value={formData.description || ''}
                    onChange={handleChange} // Assumes handleChange updates formData.description
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
            </div>

            {/* Selettore Modalità di Editing */}
            <div className="mb-4 flex space-x-2 border-b pb-2">
              <button
                onClick={() => setEditorMode('polygons')}
                className={`px-4 py-2 rounded-md text-sm font-medium
                            ${editorMode === 'polygons' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'}`}
              >
                Edit Walkable Areas
              </button>
              <button
                onClick={() => setEditorMode('placement')}
                className={`px-4 py-2 rounded-md text-sm font-medium
                            ${editorMode === 'placement' 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'}`}
              >
                Place Objects/Actors
              </button>
            </div>

            {/* Contenuto dell'Editor condizionale */}
            <div className="flex-grow"> {/* Questo div si espanderà per riempire lo spazio */}
              {(() => {
                const selectedLocationEntity = entities.find(
                    (e): e is LocationEntity => e.type === 'Location' && e.id === selectedLocationId // Find by GUID
                );
                
                if (!selectedLocationEntity) {
                    return (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                            Selected location not found.
                        </div>
                    );
                }
                const details = selectedLocationEntity.details || {};         

                if (editorMode === 'polygons') {
                  return (
                    <PolygonEditor
                      key={`${selectedLocationId}-polygons`}
                      locationId={selectedLocationId} // Pass GUID
                      initialImageUrlFromEntity={details.backgroundImage || null}
                      initialPolygonsFromEntity={details.walkableAreas || []}
                      entities={entities}
                      setEntities={setEntities}
                      imageUploadService={imageUploadService}
                    />
                  );
                } else if (editorMode === 'placement') {
                  // Filtra per ottenere solo Item e Character per le liste di selezione
                  const itemsForPlacement = entities.filter((e): e is ItemEntity => e.type === 'Item' && e.internal !== true);
                  const charactersForPlacement = entities.filter((e): e is CharacterEntity => e.type === 'Character' && e.internal !== true);
                  
                  return (
                    <PlacementEditor
                      key={`${selectedLocationId}-placement`}
                      locationId={selectedLocationId} // Pass GUID
                      locationImageUrl={details.backgroundImage || null}
                      initialPlacedObjects={details.placedItems || []} // da LocationEntityDetails
                      initialPlacedCharacters={details.placedCharacters || []} // da LocationEntityDetails
                      allItems={itemsForPlacement}
                      allCharacters={charactersForPlacement}
                      entities={entities} // Passa l'array completo di entità
                      setEntities={setEntities} // Passa la funzione per aggiornare le entità
                    />
                  );
                }
                return null; // Non dovrebbe accadere se editorMode è sempre uno dei valori validi
              })()}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a location from the list to view or edit its details.
          </div>
        )}
      </div> {/* Closing tag for the right column div */}
    </div> // Closing tag for the main flex container
  );
};
