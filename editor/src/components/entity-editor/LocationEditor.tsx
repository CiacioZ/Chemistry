'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useMemo
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, LocationEntity } from '../flow-diagram/types'; // Import LocationEntity
import { PolygonEditor } from './PolygonEditor';

// Interface for the detailed location data used in the form
interface LocationData {
  id: string; // Corresponds to Entity.value
  name: string; // Initially same as Entity.value, can be edited
  description: string;
  background: string;
  // Aggiungere altri campi come WalkableAreas, Items, etc.
}

interface LocationEditorProps { // Aggiunta interfaccia Props
  imageUploadService?: (file: File) => Promise<string>;
}

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

  // Effect to load/reset form data when selection changes
  useEffect(() => {
    if (selectedLocationId) {
      // Find the selected entity
      const selectedEntity = graphLocations.find(loc => loc.name === selectedLocationId);
      if (selectedEntity) { // selectedEntity is now LocationEntity
        const details = selectedEntity.details || {}; // Ensure details is an object
        // Initialize form data based on the selected entity
        setFormData({
          id: selectedEntity.name, // ID is the entity value
          name: selectedEntity.name, // Default name is the entity value
          description: details.description || '', // Access safely
          background: details.backgroundImage || '', // Access safely
        });
      } else {
        // If the selected ID doesn't match any current entity, reset
        setSelectedLocationId(null);
        setFormData({});
      }
    } else {
      // Reset form if no location is selected
      setFormData({});
    }
  }, [selectedLocationId, graphLocations]); // Depend on graphLocations as well

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
  };

  const handleDeleteLocation = useCallback((locationIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare l'item "${locationIdToDelete}"? Questa azione non può essere annullata.`)) {
      // Calculate the new entities array by filtering out the item to delete
      const newEntities = entities.filter((entity: Entity) => entity.name !== locationIdToDelete);
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
        <h3 className="text-lg font-semibold mb-3">Locations</h3>
        {/* TODO: Aggiungere bottone "New Location" (should add a new Entity to context) */}
        <ul>
          {/* Map over graphLocations (derived from entities) */}
          {graphLocations.map((loc) => (          
            <li
              // Use loc.value as the key, as it's the unique identifier from the Entity
              key={loc.name}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                // Compare selectedLocationId with loc.value
                selectedLocationId === loc.name ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectLocation(loc.name)} className="flex-grow"> {/* Clicca sul nome per selezionare */}
              {loc.name}
              </span>

            <button
              onClick={(e) => {
                e.stopPropagation(); // Impedisce al click di propagarsi al li e selezionare l'item
                handleDeleteLocation(loc.name);
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
      <div className="w-2/3 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Location Details</h2>
        {selectedLocationId ? (
          (() => {
            const selectedLocationEntity = entities.find(
                (e): e is LocationEntity => e.type === 'Location' && e.name === selectedLocationId
            );
            
            if (!selectedLocationEntity) {
                return (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
                        Selected location not found.
                    </div>
                );
            }
            const details = selectedLocationEntity.details || {}; // Ensure details is an object            

            return (
              <PolygonEditor
                key={selectedLocationId} // Ensures re-initialization when location changes
                locationId={selectedLocationId}
                initialImageUrlFromEntity={details.backgroundImage || null} // Access safely
                initialPolygonsFromEntity={details.walkableAreas || []} // Access safely
                entities={entities}
                setEntities={setEntities}
                imageUploadService={imageUploadService} // Passare un imageUploadService effettivo se disponibile
              />
            );
          })()
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a location from the list to view or edit its details.
          </div>
        )}
      </div> {/* Closing tag for the right column div */}
    </div> // Closing tag for the main flex container
  );
};
