'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Added useRef, useCallback
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, ItemEntity, Animation } from '../flow-diagram/types/index'; // Aggiunto ItemEntity, Animation
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// TODO: Definire un'interfaccia basata sulla struct model.Item di Go
interface ItemData {
  id: string; // Corresponds to Entity.value
  name: string;
  description: string;
  imageData?: string;
  canBePickedUp?: boolean; // Aggiunto campo per il flag
  inventoryImageData?: string; // Aggiunto campo per l'immagine dell'inventario
  animations: Animation[]; // Added animations
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

  const [selectedAnimationIndex, setSelectedAnimationIndex] = useState<number | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null); // Ref per l'input file imageData
  const imageRef = useRef<HTMLImageElement>(null); // Ref per l'immagine imageData (opzionale, per forzare il reload)
  const inventoryFileInputRef = useRef<HTMLInputElement>(null); // Ref per l'input file inventoryImageData
  const inventoryImageRef = useRef<HTMLImageElement>(null); // Ref per l'immagine inventoryImageData

  // Ref per tracciare se il formData corrente è il caricamento iniziale per l'item selezionato
  const isInitialDataLoad = useRef(false);

  useEffect(() => {
    if (selectedItemId) {
      const selectedEntity = graphItems.find(item => item.id === selectedItemId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          description: selectedEntity.details?.description || '',
          imageData: selectedEntity.details?.imageData || '',
          canBePickedUp: selectedEntity.details?.canBePickedUp || false,
          inventoryImageData: selectedEntity.details?.inventoryImageData || '',
          animations: selectedEntity.details?.animations || [],
        });
      } else {
        setSelectedItemId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedItemId, graphItems]);


  // useEffect per l'auto-salvataggio
  useEffect(() => {
    if (isInitialDataLoad.current) {
      isInitialDataLoad.current = false;
      return;
    }

    if (!selectedItemId || !formData.id) {
      return;
    }

    const itemIdToUpdate = selectedItemId;

    const newName = formData.name;
    if (newName) {
      const isNameTaken = entities.some(e => e.type === 'Item' && e.name === newName && e.id !== itemIdToUpdate);
      if (isNameTaken) {
        alert(`Il nome dell&apos;item &quot;${newName}&quot; è già in uso. Modifica del nome annullata.`);
        const originalItem = entities.find(e => e.id === itemIdToUpdate);
        setFormData(prev => ({ ...prev, name: originalItem?.name || '' }));
        return; 
      }
    }

    const newEntitiesValue: Entity[] = entities.map((entity: Entity) => {
      if (entity.id === itemIdToUpdate && entity.type === 'Item') {
        const currentEntity = entity as ItemEntity;
        return {
          ...currentEntity,
          id: currentEntity.id,
          name: formData.name || currentEntity.name,
          details: {
            ...(currentEntity.details || {}),
            description: formData.description || '',
            imageData: formData.imageData || '',
            canBePickedUp: formData.canBePickedUp || false,
            inventoryImageData: formData.inventoryImageData || '',
            animations: formData.animations || [],
          },
        };
      }
      return entity;
    });

    if (JSON.stringify(entities) !== JSON.stringify(newEntitiesValue)) {
      setEntities(newEntitiesValue);
    }
  }, [formData, selectedItemId, setEntities, entities]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setSelectedAnimationIndex(null);
    setSelectedFrameIndex(null);
  };

  const handleCreateItem = () => {
    const newGuid = uuidv4();
    const baseNewName = "NewItem";
    let newName = baseNewName;
    let counter = 1;
    while (entities.some(e => e.name === newName && e.type === 'Item')) {
        newName = `${baseNewName}_${counter}`;
        counter++;
    }

    const newItem: ItemEntity = {
        id: newGuid,
        type: 'Item',
        name: newName,
        internal: false,
        details: {
            description: '',
            imageData: '',
            canBePickedUp: false,
            inventoryImageData: '',
            animations: [],
            useWith: false // Default value for useWith
        }
    };
    setEntities(prevEntities => [...prevEntities, newItem]);
    setSelectedItemId(newGuid);
  };

  const handleDeleteItem = useCallback((itemIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare l&apos;item? Questa azione non può essere annullata.`)) {
      const newEntities = entities.filter((entity: Entity) => entity.id !== itemIdToDelete);
      setEntities(newEntities);

      if (selectedItemId === itemIdToDelete) {
        setSelectedItemId(null);
        setFormData({});
      }
    }
  }, [selectedItemId, setEntities, entities]);

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
  };

  // Funzioni per gestire le animazioni (adattate da CharacterEditor)
  const handleAddAnimation = () => {
    const newAnimation: Animation = {
      name: `Animation ${(formData.animations?.length || 0) + 1}`,
      frames: [],
      loop: true
    };
    
    setFormData(prev => ({
      ...prev,
      animations: [...(prev.animations || []), newAnimation]
    }));
  };

  const handleDeleteAnimation = (index: number) => {
    if (window.confirm('Sei sicuro di voler cancellare questa animazione?')) {
      setFormData(prev => ({
        ...prev,
        animations: prev.animations?.filter((_, i) => i !== index) || []
      }));
      
      if (selectedAnimationIndex === index) {
        setSelectedAnimationIndex(null);
        setSelectedFrameIndex(null); // Resetta anche l'indice del frame selezionato
      }
    }
  };

  const handleAnimationNameChange = (index: number, newName: string) => {
    setFormData(prev => ({
      ...prev,
      animations: prev.animations?.map((anim, i) => 
        i === index ? { ...anim, name: newName } : anim
      ) || []
    }));
  };

  // Ref per input file frame
  const frameFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFrameAnimationIndex, setPendingFrameAnimationIndex] = useState<number | null>(null);
  const [pendingFrameIndex, setPendingFrameIndex] = useState<number | null>(null);

  // Funzione per aggiungere un nuovo frame
  const handleAddFrame = (animationIndex: number) => {
    setPendingFrameAnimationIndex(animationIndex);
    setPendingFrameIndex(null);
    frameFileInputRef.current?.click();
  };

  // Funzione per sostituire l'immagine di un frame esistente
  const handleReplaceFrameImage = (animationIndex: number, frameIndex: number) => {
    setPendingFrameAnimationIndex(animationIndex);
    setPendingFrameIndex(frameIndex);
    frameFileInputRef.current?.click();
  };

  // Gestione upload immagine frame (aggiunta o sostituzione)
  const handleFrameFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || pendingFrameAnimationIndex === null) {
      setPendingFrameAnimationIndex(null);
      setPendingFrameIndex(null);
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result as string;
      setFormData((prev: Partial<ItemData>) => ({
        ...prev,
        animations: (prev.animations || []).map((anim: Animation, i: number) => {
          if (i !== pendingFrameAnimationIndex) return anim;
          if (pendingFrameIndex === null) {
            // Aggiungi nuovo frame
            return {
              ...anim,
              frames: [...anim.frames, { imageData, duration: 100 }],
            };
          } else {
            // Sostituisci immagine frame esistente
            return {
              ...anim,
              frames: anim.frames.map((frame, j) => j === pendingFrameIndex ? { ...frame, imageData } : frame),
            };
          }
        }),
      }));
      setPendingFrameAnimationIndex(null);
      setPendingFrameIndex(null);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFrame = (animationIndex: number, frameIndex: number) => {
    if (window.confirm('Sei sicuro di voler cancellare questo frame?')) {
      setFormData(prev => ({
        ...prev,
        animations: prev.animations?.map((anim, i) => 
          i === animationIndex 
            ? { ...anim, frames: anim.frames.filter((_, fi) => fi !== frameIndex) }
            : anim
        ) || []
      }));
      
      // Se il frame eliminato era quello selezionato, deselezionalo
      if (selectedAnimationIndex === animationIndex && selectedFrameIndex === frameIndex) {
        setSelectedFrameIndex(null);
      }
    }
  };

  const handleFrameDurationChange = (animationIndex: number, frameIndex: number, duration: number) => {
    setFormData(prev => ({
      ...prev,
      animations: prev.animations?.map((anim, i) => 
        i === animationIndex 
          ? { 
              ...anim, 
              frames: anim.frames.map((frame, fi) => 
                fi === frameIndex ? { ...frame, duration: Math.max(1, duration) } : frame // Assicura che la durata sia almeno 1
              )
            }
          : anim
      ) || []
    }));
  };

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista degli Items */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Items</h3>
            <button 
                onClick={handleCreateItem}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
                + New Item
            </button>
        </div>
        <ul>
          {graphItems.map((item) => (
            <li
              key={item.id}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedItemId === item.id ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectItem(item.id)} className="flex-grow">
                {item.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item.id);
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
        <h2 className="text-xl font-semibold mb-4">Item Details</h2>
        {selectedItemId && formData.id ? (
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
                    className="max-w-full max-h-full object-contain"
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
            <form className="space-y-4 pt-2" onSubmit={(e) => e.preventDefault()}>
              {/* ID (GUID) - Read-only */}
              <div className="mb-4">
                <label htmlFor="itemId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item ID (GUID - Read-only)
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
                    style={{ minHeight: '100px', maxHeight: '150px', overflow: 'hidden' }}
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

              {/* Sezione Animazioni */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Animazioni</h3>
                  <button
                    type="button"
                    onClick={handleAddAnimation}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    + Nuova Animazione
                  </button>
                </div>

                {(formData.animations && formData.animations.length > 0) ? (
                  formData.animations.map((animation, animIndex) => (
                    <div 
                      key={animIndex} 
                      className={`border rounded p-3 mb-3 ${selectedAnimationIndex === animIndex ? 'bg-blue-100 dark:bg-blue-700 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <input
                          type="text"
                          value={animation.name}
                          onClick={(e) => { // Allow clicking the input to select the animation
                            e.stopPropagation();
                            setSelectedAnimationIndex(animIndex);
                            setSelectedFrameIndex(null);
                          }}
                          onChange={(e) => {
                            e.stopPropagation(); 
                            handleAnimationNameChange(animIndex, e.target.value);
                          }}
                          className="font-medium bg-transparent border-b border-gray-400 dark:border-gray-500 focus:outline-none focus:border-blue-500 dark:text-white w-full mr-2 cursor-text"
                          placeholder="Nome Animazione"
                        />
                        <div 
                          onClick={() => { // Make the general area clickable to select animation
                              setSelectedAnimationIndex(animIndex);
                              setSelectedFrameIndex(null);
                          }}
                          className="flex-grow h-full cursor-pointer" // Invisible clickable area
                        ></div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnimation(animIndex);
                          }}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-700/30 ml-2" // Added ml-2 for spacing
                          title="Elimina Animazione"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      <div className="mb-2 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleAddFrame(animIndex);
                            setSelectedAnimationIndex(animIndex); // Ensure this animation remains selected
                          }}
                          className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                        >
                          + Aggiungi Frame
                        </button>
                        {/* Input file nascosto per upload frame */}
                        {selectedAnimationIndex === animIndex && (
                          <input
                            type="file"
                            ref={frameFileInputRef}
                            onChange={handleFrameFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                        )}
                      </div>
                      
                      {/* Inline Frame Grid */}
                      {animation.frames.length > 0 ? (
                        <div 
                            className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1 mt-2 p-1 rounded bg-gray-100 dark:bg-gray-700/50"
                            onClick={(e) => e.stopPropagation()} // Prevent clicks on grid background from deselecting animation unless a frame is clicked
                        >
                          {animation.frames.map((frame, frameIndex) => (
                            <div 
                              key={frameIndex} 
                              className={`relative border rounded p-1 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer
                                          ${selectedAnimationIndex === animIndex && selectedFrameIndex === frameIndex ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-800/50' : 'bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500/50'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnimationIndex(animIndex);
                                setSelectedFrameIndex(frameIndex);
                                handleReplaceFrameImage(animIndex, frameIndex);
                              }}
                            >
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-500 rounded mb-1 flex items-center justify-center overflow-hidden">
                                <img 
                                  src={frame.imageData} 
                                  alt={`Frame ${frameIndex + 1}`} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                      const target = e.currentTarget as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent && !parent.querySelector('.frame-img-error')) {
                                          const errorMsg = document.createElement('span');
                                          errorMsg.textContent = 'Err';
                                          errorMsg.className = 'frame-img-error text-[10px] text-red-500';
                                          parent.appendChild(errorMsg);
                                      }
                                  }}
                                  onLoad={(e) => {
                                      const target = e.currentTarget as HTMLImageElement;
                                      target.style.display = 'block';
                                      const parent = target.parentElement;
                                      const errorMsg = parent?.querySelector('.frame-img-error');
                                      if (errorMsg) errorMsg.remove();
                                  }}
                                />
                              </div>
                              <div className="flex items-center my-0.5">
                                <input
                                  type="number"
                                  value={frame.duration}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleFrameDurationChange(animIndex, frameIndex, parseInt(e.target.value, 10));
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-12 text-center px-0.5 py-0 border border-gray-300 dark:border-gray-500 rounded text-xs dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                  min="1"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">ms</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFrame(animIndex, frameIndex);
                                }}
                                className="absolute top-0 right-0 text-red-500 hover:text-red-600 dark:text-red-300 dark:hover:text-red-200 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-700/40 focus:outline-none"
                                title="Delete Frame"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.8" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div onClick={(e) => e.stopPropagation()} className="cursor-default">
                           <p className="text-gray-500 dark:text-gray-400 text-xs italic mt-2 py-1 px-2 rounded bg-gray-100 dark:bg-gray-700/50 text-center">
                            Nessun frame. Clicca &quot;+ Aggiungi Frame&quot;.
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic">Nessuna animazione definita per questo item.</p>
                )}
              </div>

              {/* Bottoni Azioni */}
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => handleDeleteItem(selectedItemId)}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  disabled={!selectedItemId}
                >
                  Delete Item
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select an item from the list to view or edit its details, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
};