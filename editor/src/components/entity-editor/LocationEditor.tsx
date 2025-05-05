'use client';

import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity } from '../flow-diagram/types'; // Removed EntityType as it's not directly used here
import { PolygonEditor } from './PolygonEditor';

// Interface for the detailed location data used in the form
interface LocationData {
  id: string; // Corresponds to Entity.value
  name: string; // Initially same as Entity.value, can be edited
  description: string;
  background: string;
  // Aggiungere altri campi come WalkableAreas, Items, etc.
}

export const LocationEditor: React.FC = () => {
  const { entities } = useDiagramContext();

  // Derive the list of location entities directly from the context
  const graphLocations = useMemo(() => {
    return entities.filter((entity): entity is Entity & { type: 'Location' } => entity.type === 'Location' && entity.internal === false );
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
      if (selectedEntity) {
        // Initialize form data based on the selected entity
        // TODO: In the future, load saved detailed data associated with this ID
        setFormData({
          id: selectedEntity.name, // ID is the entity value
          name: selectedEntity.name, // Default name is the entity value
          description: '', // Default empty
          background: '', // Default empty
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
              // Pass loc.value to the selection handler
              onClick={() => handleSelectLocation(loc.name)}
              className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                // Compare selectedLocationId with loc.value
                selectedLocationId === loc.name ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              {/* Display loc.value */}
              {loc.name}
            </li>
          ))}
        </ul>
      </div> {/* Closing tag for the left column div */}

      {/* Colonna Destra: Form di Editing */}
      <div className="w-2/3 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Location Details</h2>
        {selectedLocationId ? (
          <PolygonEditor />
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a location from the list to view or edit its details.
          </div>
        )}
      </div> {/* Closing tag for the right column div */}
    </div> // Closing tag for the main flex container
  );
};
// Removed the duplicate code block that was causing the final error
