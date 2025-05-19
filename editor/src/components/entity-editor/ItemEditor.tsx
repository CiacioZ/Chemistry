'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, ItemEntity } from '../flow-diagram/types/index'; // Aggiunto ItemEntity

// TODO: Definire un'interfaccia basata sulla struct model.Item di Go
interface ItemData {
  id: string; // Corresponds to Entity.value
  name: string;
  description: string;
  imageData?: string;
  canBePickedUp?: boolean; // Aggiunto campo per il flag
  inventoryImageData?: string; // Aggiunto campo per l'immagine dell'inventario
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
  const [isUploading, setIsUploading] = useState<boolean>(false); // Stato per il caricamento imageData
  const [isUploadingInventory, setIsUploadingInventory] = useState<boolean>(false); // Stato per il caricamento inventoryImageData

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref per l'input file imageData
  const imageRef = useRef<HTMLImageElement>(null); // Ref per l'immagine imageData (opzionale, per forzare il reload)
  const inventoryFileInputRef = useRef<HTMLInputElement>(null); // Ref per l'input file inventoryImageData
  const inventoryImageRef = useRef<HTMLImageElement>(null); // Ref per l'immagine inventoryImageData

  // Ref per tracciare se il formData corrente è il caricamento iniziale per l'item selezionato
  const isInitialDataLoad = useRef(false);

  useEffect(() => {
    if (selectedItemId) {
      const selectedEntity = graphItems.find(item => item.name === selectedItemId);
      if (selectedEntity) {
        isInitialDataLoad.current = true; // Segna che stiamo caricando i dati iniziali
        setFormData({
          id: selectedEntity.name,
          name: selectedEntity.name,
          description: selectedEntity.details?.description || '',
          imageData: selectedEntity.details?.imageData || '',
          canBePickedUp: selectedEntity.details?.canBePickedUp || false,
          inventoryImageData: selectedEntity.details?.inventoryImageData || '',
        });
      } else {
        setSelectedItemId(null); // Item non trovato, deseleziona
        setFormData({});
      }
    } else {
      setFormData({}); // Nessun item selezionato
    }
  }, [selectedItemId, graphItems]);


  // useEffect per l'auto-salvataggio
  useEffect(() => {
    // 1. Non salvare se è il caricamento iniziale dei dati per l'item selezionato.
    if (isInitialDataLoad.current) {
      isInitialDataLoad.current = false; // Resetta il flag per le modifiche successive
      return;
    }

    // 2. Salva solo se un item è selezionato e formData è popolato.
    // formData.id dovrebbe contenere la chiave dell'item in modifica.
    if (!selectedItemId || !formData.id) {
      return;
    }

    const itemToUpdateKey = selectedItemId; // La chiave dell'item nell'array `entities`

    // Gestione del rename: se formData.name è diverso da itemToUpdateKey
    const newName = formData.name;
    if (newName && newName !== itemToUpdateKey) {
      // This 'entities.some' uses the 'entities' from the closure when the effect was scheduled.
      // Since 'entities' will be in the dependency array, this will use the current 'entities'.
      const isNameTaken = entities.some(e => e.name === newName && e.name !== itemToUpdateKey);
      if (isNameTaken) {
        alert(`Il nome dell'item "${newName}" è già in uso. Modifica del nome annullata.`);
        setFormData(prev => ({ ...prev, name: itemToUpdateKey }));
        return; 
      }
    }

    // Calculate the new entities array based on the current `entities`
    const newEntitiesValue: Entity[] = entities.map((entity: Entity) => {
      if (entity.type === 'Item' && entity.name === itemToUpdateKey) { 
        const currentEntity = entity as ItemEntity;
        return {
          ...currentEntity,
          name: formData.name || currentEntity.name, 
          details: {
            ...(currentEntity.details || {}),
            description: formData.description || '',
            imageData: formData.imageData || '',
            canBePickedUp: formData.canBePickedUp || false,
            inventoryImageData: formData.inventoryImageData || '',
          },
        };
      }
      return entity;
    });

    // To prevent infinite loops, only call setEntities if the data has actually changed.
    // JSON.stringify is a simple way for deep comparison but has performance caveats for large/complex data.
    // Consider a proper deep-equal utility or immutable update patterns for production.
    if (JSON.stringify(entities) !== JSON.stringify(newEntitiesValue)) {
      setEntities(newEntitiesValue);
    }

    // Se il rename ha avuto successo (non bloccato da isNameTaken), aggiorna selectedItemId al nuovo nome
    if (newName && newName !== itemToUpdateKey) {
       // Ensure the name isn't taken in the *new* array if setEntities was conditional or async
       // This check might be redundant if the earlier `isNameTaken` is sufficient and updates are synchronous
       const nameStillAvailableInNewArray = !newEntitiesValue.some(e => e.name === newName && e.name !== newName /* check if newName is now the key */);
       if (nameStillAvailableInNewArray) { // Simplified: assuming the previous check is robust enough for this flow
           setSelectedItemId(newName); 
       }
    }
  }, [formData, selectedItemId, setEntities, entities]); // `entities` is now a dependency


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // L'useEffect che osserva formData gestirà il salvataggio.
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
  };

  const handleDeleteItem = useCallback((itemIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare l'item "${itemIdToDelete}"? Questa azione non può essere annullata.`)) {
      // Calculate the new entities array by filtering out the item to delete
      const newEntities = entities.filter((entity: Entity) => entity.name !== itemIdToDelete);
      setEntities(newEntities); // Pass the new array directly

      if (selectedItemId === itemIdToDelete) {
        setSelectedItemId(null);
        setFormData({});
      }
      // Potresti voler mostrare una notifica di successo qui
    }
  }, [selectedItemId, setEntities, entities]); // Added `entities` to the dependency array

  // Rimuoviamo handleSaveChanges
  // const handleSaveChanges = () => { ... };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleInventoryImageUploadClick = () => {
    inventoryFileInputRef.current?.click();
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
        imageData: uploadedUrl, // Aggiorna imageData
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

  const handleInventoryFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !imageUploadService) {
      if (!imageUploadService) {
        console.warn("imageUploadService is not provided to ItemEditor.");
        alert("Servizio di caricamento immagine non configurato.");
      }
      return;
    }

    setIsUploadingInventory(true);
    try {
      const uploadedUrl = await imageUploadService(file);
      setFormData(prevData => ({
        ...prevData,
        inventoryImageData: uploadedUrl, // Aggiorna inventoryImageData
      }));
      if (inventoryImageRef.current) {
        inventoryImageRef.current.src = uploadedUrl;
      }
    } catch (error) {
      console.error("Error uploading inventory image:", error);
      alert("Errore durante il caricamento dell'immagine per l'inventario.");
    } finally {
      setIsUploadingInventory(false);
      if (inventoryFileInputRef.current) {
        inventoryFileInputRef.current.value = '';
      }
    }
    // L'useEffect che osserva formData gestirà il salvataggio.
  };


  // TODO: Implementare funzioni Create New, Delete (Delete Item rimane)
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
              // onClick={() => handleSelectItem(item.name)} // Spostato per permettere click separati
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedItemId === item.name ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectItem(item.name)} className="flex-grow"> {/* Clicca sul nome per selezionare */}
                {item.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Impedisce al click di propagarsi al li e selezionare l'item
                  handleDeleteItem(item.name);
                }}
                className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 focus:outline-none"
                aria-label={`Delete ${item.name}`}
                title={`Delete ${item.name}`}
              >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Item */}
      <div className="w-2/3 flex flex-col space-y-4 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold">Item Details</h2>
        {selectedItemId ? (
          <>
            {/* Sezione Upload e Anteprima Immagine (Item Image) */}
            <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Item Image (In-Game)
                </label>
                <button
                  type="button"
                  onClick={handleImageUploadClick}
                  disabled={isUploading || !imageUploadService || isUploadingInventory}
                  className={`px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white 
                              ${isUploading || !imageUploadService || isUploadingInventory ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {isUploading ? 'Uploading...' : (formData.imageData ? 'Change Image' : 'Upload Image')}
                </button>
              </div>
              <div 
                className="mt-1 w-full flex justify-center items-center bg-gray-200 dark:bg-gray-600 rounded" 
                style={{ minHeight: '150px', maxHeight: '250px', overflow: 'hidden' }}
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

              {/* Can Be Picked Up Checkbox */}
              <div className="mb-4">
                <label htmlFor="canBePickedUp" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    id="canBePickedUp"
                    name="canBePickedUp"
                    checked={formData.canBePickedUp || false}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Can be picked up
                </label>
              </div>

              {/* Sezione Upload e Anteprima Immagine per Inventario (condizionale) */}
              {formData.canBePickedUp && (
                <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-sm mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                      Inventory Image
                    </label>
                    <button
                      type="button"
                      onClick={handleInventoryImageUploadClick}
                      disabled={isUploadingInventory || !imageUploadService || isUploading}
                      className={`px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white 
                                  ${isUploadingInventory || !imageUploadService || isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}
                                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500`}
                    >
                      {isUploadingInventory ? 'Uploading...' : (formData.inventoryImageData ? 'Change Inventory Image' : 'Upload Inventory Image')}
                    </button>
                  </div>
                  <div 
                    className="mt-1 w-full flex justify-center items-center bg-gray-200 dark:bg-gray-600 rounded" 
                    style={{ minHeight: '100px', maxHeight: '150px', overflow: 'hidden' }} // Area anteprima più piccola per inventario
                  >
                    {formData.inventoryImageData ? (
                      <img
                        ref={inventoryImageRef}
                        src={formData.inventoryImageData}
                        alt="Inventory image preview"
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.img-error-msg-inv')) {
                                const errorMsg = document.createElement('p');
                                errorMsg.textContent = 'Failed to load inventory image.';
                                errorMsg.className = 'text-xs text-red-500 img-error-msg-inv text-center p-4';
                                parent.appendChild(errorMsg);
                            }
                        }}
                        onLoad={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'block';
                            const parent = target.parentElement;
                            const errorMsg = parent?.querySelector('.img-error-msg-inv');
                            if (errorMsg) errorMsg.remove();
                        }}
                      />
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                        {isUploadingInventory ? 'Loading preview...' : 'Inventory image preview.'}
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={inventoryFileInputRef}
                    onChange={handleInventoryFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                   {!imageUploadService && (
                      <p className="text-xs text-red-500 mt-1 text-center">Image upload service not available.</p>
                  )}
                </div>
              )}

              {/* TODO: Aggiungere altri campi specifici per Item */}
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Altri campi specifici per gli Item verranno aggiunti qui...
              </p>
              {/* Bottoni Azioni */}
              <div className="flex justify-end space-x-2 mt-6">               
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