'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity } from '../flow-diagram/types';

// TODO: Definire un'interfaccia basata sulla struct model.Item di Go
interface ItemData {
  id: string; // Corresponds to Entity.value
  name: string;
  description: string;
  // Aggiungere altri campi specifici per gli Item (es. immagine, peso, proprietà...)
}

export const ItemEditor: React.FC = () => {
  const { entities } = useDiagramContext();

  // Filtra le entità per ottenere solo gli Item
  const graphItems = useMemo(() => {
    return entities.filter((entity): entity is Entity & { type: 'Item' } => entity.type === 'Item');
  }, [entities]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ItemData>>({});

  useEffect(() => {
    if (selectedItemId) {
      const selectedEntity = graphItems.find(item => item.value === selectedItemId);
      if (selectedEntity) {
        // TODO: Caricare dati dettagliati salvati per questo Item ID
        setFormData({
          id: selectedEntity.value,
          name: selectedEntity.value, // Default name
          description: '', // Default empty
          // Inizializzare altri campi specifici dell'Item
        });
      } else {
        setSelectedItemId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedItemId, graphItems]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    // TODO: Logica di salvataggio
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
  };

  // TODO: Implementare funzioni Save, Create New, Delete

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista degli Items */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-semibold mb-3">Items</h3>
        {/* TODO: Bottone "New Item" */}
        <ul>
          {graphItems.map((item) => (
            <li
              key={item.value}
              onClick={() => handleSelectItem(item.value)}
              className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedItemId === item.value ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              {item.value}
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Item */}
      <div className="w-2/3 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Item Details</h2>
        {selectedItemId ? (
          <form>
            {/* ID */}
            <div className="mb-4">
              <label htmlFor="itemId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item ID (Read-only)
              </label>
              <input
                type="text"
                id="itemId"
                name="id"
                value={formData.id || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
              />
            </div>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="itemName"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {/* Description */}
            <div className="mb-4">
              <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                id="itemDescription"
                name="description"
                rows={3}
                value={formData.description || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            {/* TODO: Aggiungere altri campi specifici per Item */}
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Altri campi specifici per gli Item verranno aggiunti qui...
            </p>
            {/* Bottoni Azioni */}
            <div className="flex justify-end space-x-2 mt-6">
              <button type="button" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Save Changes
              </button>
              <button type="button" className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                Delete Item
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select an item from the list to view or edit its details.
          </div>
        )}
      </div>
    </div>
  );
};