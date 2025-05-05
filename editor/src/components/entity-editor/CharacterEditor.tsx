'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity } from '../flow-diagram/types';

// TODO: Definire un'interfaccia basata sulla struct model.Character di Go
interface CharacterData {
  id: string; // Corresponds to Entity.value
  name: string;
  description: string;
  // Aggiungere altri campi specifici per i Character (es. sprite, dialoghi, inventario...)
}

export const CharacterEditor: React.FC = () => {
  const { entities } = useDiagramContext();

  // Filtra le entità per ottenere solo i Character
  const graphCharacters = useMemo(() => {
    return entities.filter((entity): entity is Entity & { type: 'Character' } => entity.type === 'Character' && entity.internal === false );
  }, [entities]);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CharacterData>>({});

  useEffect(() => {
    if (selectedCharacterId) {
      const selectedEntity = graphCharacters.find(char => char.name === selectedCharacterId);
      if (selectedEntity) {
        // TODO: Caricare dati dettagliati salvati per questo Character ID
        setFormData({
          id: selectedEntity.name,
          name: selectedEntity.name, // Default name
          description: '', // Default empty
          // Inizializzare altri campi specifici del Character
        });
      } else {
        setSelectedCharacterId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedCharacterId, graphCharacters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    // TODO: Logica di salvataggio
  };

  const handleSelectCharacter = (id: string) => {
    setSelectedCharacterId(id);
  };

  // TODO: Implementare funzioni Save, Create New, Delete

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista dei Characters */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-semibold mb-3">Characters</h3>
        {/* TODO: Bottone "New Character" */}
        <ul>
          {graphCharacters.map((char) => (
            <li
              key={char.name}
              onClick={() => handleSelectCharacter(char.name)}
              className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedCharacterId === char.name ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              {char.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Character */}
      <div className="w-2/3 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Character Details</h2>
        {selectedCharacterId ? (
          <form>
            {/* ID */}
            <div className="mb-4">
              <label htmlFor="characterId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Character ID (Read-only)
              </label>
              <input
                type="text"
                id="characterId"
                name="id"
                value={formData.id || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
              />
            </div>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="characterName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="characterName"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {/* Description */}
            <div className="mb-4">
              <label htmlFor="characterDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="characterDescription"
                name="description"
                rows={3}
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {/* TODO: Aggiungere altri campi specifici per Character */}
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Altri campi specifici per i Character verranno aggiunti qui...
            </p>
            {/* Bottoni Azioni */}
            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Save Changes
              </button>
              <button type="button" className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                Delete Character
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a character from the list to view or edit its details.
          </div>
        )}
      </div>
    </div>
  );
};