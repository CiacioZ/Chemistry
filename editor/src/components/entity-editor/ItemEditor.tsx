'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, ItemEntity } from '../flow-diagram/types'; // Aggiunto ItemEntity

// TODO: Definire un'interfaccia basata sulla struct model.Item di Go
interface ItemData {
  id: string; // Corresponds to Entity.value
  name: string;
  description: string;
  imageData?: string; // Aggiunto campo per l'URL dell'immagine
  // Aggiungere altri campi specifici per gli Item (es. immagine, peso, proprietà...)
}

interface ItemEditorProps { // Aggiunta interfaccia Props
  imageUploadService?: (file: File) => Promise<string>;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({ imageUploadService }) => { // Aggiunta props
  const { entities, setEntities } = useDiagramContext(); // Aggiunto setEntities

  // Filtra le entità per ottenere solo gli Item
  const graphItems = useMemo(() => {
    return entities.filter((entity): entity is ItemEntity => entity.type === 'Item'  && entity.internal === false );
  }, [entities]);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ItemData>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false); // Stato per il caricamento

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref per l'input file
  const imageRef = useRef<HTMLImageElement>(null); // Ref per l'immagine (opzionale, per forzare il reload)

  useEffect(() => {
    if (selectedItemId) {
      const selectedEntity = graphItems.find(item => item.name === selectedItemId);
      if (selectedEntity) {
        // Carica i dati dettagliati dell'entità Item selezionata
        setFormData({
          id: selectedEntity.name,
          name: selectedEntity.name,
          description: selectedEntity.details?.description || '',
          imageData: selectedEntity.details?.imageData || '', // Carica imageUrl
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
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
  };

  const handleSaveChanges = () => {
    if (!selectedItemId || !formData.name) {
      alert("Item name cannot be empty.");
      return;
    }

    // Calculate the new state based on the current 'entities' from the context
    const newEntities = entities.map((entity: Entity) => {
      if (entity.type === 'Item' && entity.name === selectedItemId) {
        const updatedItemEntity = entity as ItemEntity; // Cast per accedere a details
        return {
          ...updatedItemEntity,
          name: formData.name!, // Il nome dell'entità deve essere aggiornato se formData.name cambia
          details: {
            ...(updatedItemEntity.details || {}),
            description: formData.description || '',
            imageData: formData.imageData || '',
            // canBePickedUp non è nel form, quindi lo manteniamo com'è o lo gestiamo separatamente
          },
        };
      }
      return entity;
    });

    setEntities(newEntities); // Pass the computed array directly
    alert('Item details saved!');
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !imageUploadService) {
      if (!imageUploadService) {
        console.warn("imageUploadService is not provided to ItemEditor.");
        alert("Servizio di caricamento immagine non configurato.");
      }
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrl = await imageUploadService(file);
      setFormData(prevData => ({
        ...prevData,
        imageUrl: uploadedUrl,
      }));
      // Se si usa imageRef per forzare l'aggiornamento dell'immagine visualizzata
      if (imageRef.current) {
        imageRef.current.src = uploadedUrl;
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Errore durante il caricamento dell'immagine.");
    } finally {
      setIsUploading(false);
      // Resetta l'input file per permettere di caricare lo stesso file di nuovo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  // TODO: Implementare funzioni Create New, Delete

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista degli Items */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-semibold mb-3">Items</h3>
        {/* TODO: Bottone "New Item" */}
        <ul>
          {graphItems.map((item) => (
            <li
              key={item.name}
              onClick={() => handleSelectItem(item.name)}
              className={`p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedItemId === item.name ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              {item.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Item */}
      <div className="w-2/3 flex flex-col space-y-4 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold">Item Details</h2>
        {selectedItemId ? (
          <>
            {/* Sezione Upload e Anteprima Immagine (più prominente) */}
            <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Item Image
                </label>
                <button
                  type="button"
                  onClick={handleImageUploadClick}
                  disabled={isUploading || !imageUploadService}
                  className={`px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white 
                              ${isUploading || !imageUploadService ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {isUploading ? 'Uploading...' : (formData.imageData ? 'Change Image' : 'Upload Image')}
                </button>
              </div>
              <div 
                className="mt-1 w-full flex justify-center items-center bg-gray-200 dark:bg-gray-600 rounded" 
                style={{ minHeight: '150px', maxHeight: '250px', overflow: 'hidden' }} // Area anteprima più grande e definita
              >
                {formData.imageData ? (
                  <img
                    ref={imageRef}
                    src={formData.imageData}
                    alt="Item image preview"
                    className="max-w-full max-h-full object-contain" // Scala per adattarsi al contenitore
                    onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.img-error-msg')) {
                            const errorMsg = document.createElement('p');
                            errorMsg.textContent = 'Failed to load image.';
                            errorMsg.className = 'text-xs text-red-500 img-error-msg text-center p-4';
                            parent.appendChild(errorMsg);
                        }
                    }}
                    onLoad={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'block';
                        const parent = target.parentElement;
                        const errorMsg = parent?.querySelector('.img-error-msg');
                        if (errorMsg) errorMsg.remove();
                    }}
                  />
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                    {isUploading ? 'Loading preview...' : 'Image preview will appear here.'}
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              {!imageUploadService && (
                  <p className="text-xs text-red-500 mt-1 text-center">Image upload service not available.</p>
              )}
            </div>

            {/* Form per altri dettagli */}
            <form className="space-y-4 pt-2"> {/* Aggiunto un po' di padding top per separazione */}
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

              {/* Rimosso il vecchio blocco immagine da qui */}

              {/* TODO: Aggiungere altri campi specifici per Item */}
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Altri campi specifici per gli Item verranno aggiunti qui...
              </p>
              {/* Bottoni Azioni */}
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button" 
                  onClick={handleSaveChanges}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Save Changes
                </button>
                <button type="button" className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">
                  Delete Item
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select an item from the list to view or edit its details.
          </div>
        )}
      </div>
    </div>
  );
};