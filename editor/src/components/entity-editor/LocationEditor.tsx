'use client';

import React, { useState, useEffect, useMemo, useCallback, Dispatch, SetStateAction, useRef } from 'react'; // Added useRef
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, LocationEntity, ItemEntity, CharacterEntity, LocationDetails, Polygon, PlacedEntity, Point } from '../flow-diagram/types/index'; // Importa ItemEntity, CharacterEntity, AND LocationDetails, Polygon, PlacedEntity, Point
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

export interface LocationEditorProps { // Aggiunta interfaccia Props // Ensure this is exported
  imageUploadService?: (file: File) => Promise<string>;
  setEntities: Dispatch<SetStateAction<Entity[]>>; // MODIFICATO
  onLocationSelectedForSubEditing?: (locationId: string | null) => void; // Added callback prop
}

// Definiamo i tipi per le modalità di editing
type EditorMode = 'polygons' | 'placement';

export const LocationEditor: React.FC<LocationEditorProps> = ({ imageUploadService, onLocationSelectedForSubEditing }) => {
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
  const currentSelectedLocationDetails = useMemo(() => {
    if (!selectedLocationId) return null;
    const loc = entities.find(e => e.id === selectedLocationId && e.type === 'Location') as LocationEntity | undefined;
    // Ensure a full LocationDetails object, even if details are initially undefined
    return {
        description: '',
        backgroundImage: '',
        walkableArea: [],
        polygons: [],
        placedItems: [],
        placedCharacters: [],
        ...(loc?.details || {}),
    } as LocationDetails;
  }, [selectedLocationId, entities]);

  useEffect(() => {
    if (selectedLocationId) {
      const selectedEntity = graphLocations.find(loc => loc.id === selectedLocationId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        // Use currentSelectedLocationDetails which guarantees a full object
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          description: currentSelectedLocationDetails?.description || '',
          background: currentSelectedLocationDetails?.backgroundImage || '',
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
                
                // Ensure we have a base for details, even if locEntity.details is undefined
                const baseDetails: LocationDetails = {
                    description: '',
                    backgroundImage: '',
                    walkableArea: [],
                    polygons: [],
                    placedItems: [],
                    placedCharacters: [],
                    ...(locEntity.details || {}), // Spread existing details over defaults
                };

                const newName = formData.name || ''; 
                const newDescription = formData.description || '';

                const currentName = locEntity.name || '';
                // Use baseDetails for comparison to ensure properties exist
                const currentDesc = baseDetails.description;

                if (currentName !== newName || currentDesc !== newDescription) {
                    if (currentName !== newName) {
                        const isNameTaken = prevEntities.some(e => 
                            e.type === 'Location' && 
                            e.name === newName && 
                            e.id !== locationIdToUpdate
                        );
                        if (isNameTaken) {
                            return locEntity; 
                        }
                    }
                    
                    entityActuallyChanged = true; 
                    return {
                        ...locEntity,
                        name: newName,
                        details: {
                            ...baseDetails, // Spread base details first
                            description: newDescription, // Then override specific fields
                            // Other fields like backgroundImage, polygons etc., are preserved from baseDetails
                        },
                    } as LocationEntity;
                }
                return locEntity; 
            }
            return entity;
        });

        if (entityActuallyChanged) {
            return updatedEntities;
        }
        return prevEntities; 
    });
  }, [formData.name, formData.description, selectedLocationId, setEntities]); // Removed entities from dependencies

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
    if (onLocationSelectedForSubEditing) {
      onLocationSelectedForSubEditing(id);
    }
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
            backgroundImage: '',
            walkableArea: [],
            polygons: [],
            placedItems: [],
            placedCharacters: []
        }
    };
    setEntities(prevEntities => [...prevEntities, newLocation]);
    setSelectedLocationId(newGuid); // Select the new location by its GUID
    setEditorMode('polygons'); // Set to default edit mode
    if (onLocationSelectedForSubEditing) {
      onLocationSelectedForSubEditing(newGuid);
    }
  };

  const handleDeleteLocation = useCallback((locationIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare la location? Questa azione non può essere annullata.`)) {
      // Calculate the new entities array by filtering out the item to delete
      const newEntities = entities.filter((entity: Entity) => entity.id !== locationIdToDelete);
      setEntities(newEntities); // Pass the new array directly

      if (selectedLocationId === locationIdToDelete) {
        setSelectedLocationId(null);
        setFormData({});
        if (onLocationSelectedForSubEditing) {
          onLocationSelectedForSubEditing(null);
        }
      }
      // Potresti voler mostrare una notifica di successo qui
    }
  }, [selectedLocationId, setEntities, entities, onLocationSelectedForSubEditing]); 

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
                    value={formData.id || ''} // Use formData.id which is set from selectedLocationId
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
                onChange={handleChange}
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
                rows={3}
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Mode Toggles */}
            <div className="mb-4 flex space-x-2 border-b pb-2">
              <button 
                onClick={() => setEditorMode('polygons')} 
                className={`px-3 py-1 rounded text-sm ${editorMode === 'polygons' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
              >
                Edit Walkable Area / Background
              </button>
              <button 
                onClick={() => setEditorMode('placement')} 
                className={`px-3 py-1 rounded text-sm ${editorMode === 'placement' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
              >
                Place Entities
              </button>
            </div>

            {/* Conditional rendering of PolygonEditor or PlacementEditor based on mode */}
            {editorMode === 'polygons' && currentSelectedLocationDetails && (
              <PolygonEditor
                locationId={selectedLocationId} // Pass GUID
                initialImageUrlFromEntity={currentSelectedLocationDetails.backgroundImage || null} // Use memoized details
                initialPolygonsFromEntity={currentSelectedLocationDetails.polygons || []} // Changed from walkableArea to polygons
                entities={entities}
                setEntities={setEntities}
                imageUploadService={imageUploadService}
              />
            )}
            {editorMode === 'placement' && currentSelectedLocationDetails && (
              <PlacementEditor
                locationId={selectedLocationId}
                locationImageUrl={currentSelectedLocationDetails.backgroundImage || null} // Use memoized details
                initialPlacedObjects={currentSelectedLocationDetails.placedItems || []}
                initialPlacedCharacters={currentSelectedLocationDetails.placedCharacters || []}
                allItems={entities.filter(e => e.type === 'Item') as ItemEntity[]}
                allCharacters={entities.filter(e => e.type === 'Character') as CharacterEntity[]}
                entities={entities} // Pass full entities list for other lookups if needed
                setEntities={setEntities}
              />
            )}
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
