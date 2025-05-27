'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, CharacterEntity, Animation, AnimationFrame } from '../flow-diagram/types/index';
import { v4 as uuidv4 } from 'uuid';

// Interfaccia per il formData, aggiornata per includere le animazioni
interface CharacterData {
  id: string;
  name: string;
  description: string;
  animations: Animation[];
}

export const CharacterEditor: React.FC = () => {
  const { entities, setEntities } = useDiagramContext();

  // Filtra le entità per ottenere solo i Character
  const graphCharacters = useMemo(() => {
    return entities.filter((entity): entity is CharacterEntity => entity.type === 'Character' && entity.internal === false );
  }, [entities]);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CharacterData>>({});

  // Ref per tracciare se il formData corrente è il caricamento iniziale per il character selezionato
  const isInitialDataLoad = useRef(false);

  const [selectedAnimationIndex, setSelectedAnimationIndex] = useState<number | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedCharacterId) {
      const selectedEntity = graphCharacters.find(char => char.id === selectedCharacterId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          description: selectedEntity.details?.description || '',
          animations: selectedEntity.details?.animations || [],
        });
      } else {
        setSelectedCharacterId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedCharacterId, graphCharacters]);


  // useEffect per l'auto-salvataggio
  useEffect(() => {
    // 1. Non salvare se è il caricamento iniziale dei dati.
    if (isInitialDataLoad.current) {
      isInitialDataLoad.current = false; // Resetta il flag per le modifiche successive
      return;
    }

    // 2. Salva solo se un character è selezionato e formData è popolato.
    if (!selectedCharacterId || !formData.id) {
      return;
    }

    const characterIdToUpdate = selectedCharacterId;

    // Gestione del rename: se formData.name è diverso da characterIdToUpdate
    const newName = formData.name;
    if (newName) {
      // Check if the new name is taken by another character (excluding the current one being edited)
      const isNameTaken = entities.some(e => e.type === 'Character' && e.name === newName && e.id !== characterIdToUpdate);
      if (isNameTaken) {
        alert(`Il nome del character "${newName}" è già in uso. Modifica del nome annullata.`);
        // Find the original name to revert to if newName is taken
        const originalCharacter = entities.find(e => e.id === characterIdToUpdate);
        setFormData(prev => ({ ...prev, name: originalCharacter?.name || '' }));
        return;
      }
    }

    const newEntitiesValue: Entity[] = entities.map((entity: Entity) => {
      if (entity.id === characterIdToUpdate && entity.type === 'Character') {
        const currentEntity = entity as CharacterEntity; // Cast a CharacterEntity
        return {
          ...currentEntity,
          id: currentEntity.id, // ID (GUID) does not change
          name: formData.name || currentEntity.name, // Name can change
          details: {
            ...(currentEntity.details || {}),
            description: formData.description || '',
            animations: formData.animations || [], // Aggiungi questa riga
          },
        };
      }
      return entity;
    });

    if (JSON.stringify(entities) !== JSON.stringify(newEntitiesValue)) {
      setEntities(newEntitiesValue);
    }
  }, [formData, selectedCharacterId, setEntities, entities]); // `entities` è ora una dipendenza


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
    // L'useEffect che osserva formData gestirà il salvataggio.
  };

  const handleSelectCharacter = (id: string) => {
    setSelectedCharacterId(id);
    // Reset animation/frame selection when character changes
    setSelectedAnimationIndex(null);
    setSelectedFrameIndex(null);
  };

  const handleCreateCharacter = () => {
    const newGuid = uuidv4();
    const baseNewName = "NewCharacter";
    let newName = baseNewName;
    let counter = 1;
    while (entities.some(e => e.name === newName && e.type === 'Character')) {
        newName = `${baseNewName}_${counter}`;
        counter++;
    }

    const newCharacter: CharacterEntity = {
        id: newGuid,
        type: 'Character',
        name: newName,
        internal: false,
        details: {
            description: '',
            animations: [],
            inventory: []
        }
    };
    setEntities(prevEntities => [...prevEntities, newCharacter]);
    setSelectedCharacterId(newGuid); // Select the new character by its GUID
 };

  const handleDeleteCharacter = useCallback((characterIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare il character? Questa azione non può essere annullata.`)) {
      const newEntities = entities.filter((entity: Entity) => entity.id !== characterIdToDelete);
      setEntities(newEntities);

      if (selectedCharacterId === characterIdToDelete) {
        setSelectedCharacterId(null);
        setFormData({});
      }
    }
  }, [selectedCharacterId, setEntities, entities]);

  // Funzioni per gestire le animazioni
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
        setSelectedFrameIndex(null);
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

  const handleAddFrame = (animationIndex: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          const newFrame: AnimationFrame = {
            imageData,
            duration: 100 // Default 100ms
          };
          
          setFormData(prev => ({
            ...prev,
            animations: prev.animations?.map((anim, i) => 
              i === animationIndex 
                ? { ...anim, frames: [...anim.frames, newFrame] }
                : anim
            ) || []
          }));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
      
      if (selectedFrameIndex === frameIndex) {
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
                fi === frameIndex ? { ...frame, duration } : frame
              )
            }
          : anim
      ) || []
    }));
  };

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista dei Characters */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Characters</h3>
            <button 
                onClick={handleCreateCharacter}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
                + New Character
            </button>
        </div>
        <ul>
          {graphCharacters.map((char) => (
            <li
              key={char.id}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedCharacterId === char.id ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectCharacter(char.id)} className="flex-grow">
                {char.name}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCharacter(char.id);
                }}
                className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 focus:outline-none"
                aria-label={`Delete ${char.name}`}
                title={`Delete ${char.name}`}
              >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Character */}
      <div className="w-2/3 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Character Details</h2>
        {selectedCharacterId ? (
          <form onSubmit={(e) => e.preventDefault()}>
            {/* ID (GUID) - Read-only */}
            <div className="mb-4">
              <label htmlFor="characterId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Character ID (GUID - Read-only)
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
              
              {formData.animations?.map((animation, animIndex) => (
                <div key={animIndex} className="border rounded p-3 mb-3 bg-gray-50 dark:bg-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <input
                      type="text"
                      value={animation.name}
                      onChange={(e) => handleAnimationNameChange(animIndex, e.target.value)}
                      className="font-medium bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteAnimation(animIndex)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Elimina
                    </button>
                  </div>
                  
                  <div className="mb-2">
                    <button
                      type="button"
                      onClick={() => handleAddFrame(animIndex)}
                      className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                    >
                      + Aggiungi Frame
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-2">
                    {animation.frames.map((frame, frameIndex) => (
                      <div key={frameIndex} className="relative border rounded p-1 bg-white dark:bg-gray-800 flex flex-col items-center">
                        <img
                          src={frame.imageData}
                          alt={`Frame ${frameIndex + 1}`}
                          className="w-20 h-20 object-contain bg-gray-100 dark:bg-gray-700 rounded mb-1"
                        />
                        <div className="flex items-center justify-between text-xs mt-1 w-full">
                          <input
                            type="number"
                            value={frame.duration || 100}
                            onChange={(e) => handleFrameDurationChange(animIndex, frameIndex, parseInt(e.target.value))}
                            className="w-16 px-1 py-0.5 border rounded text-xs dark:bg-gray-600 dark:border-gray-500 dark:text-white text-center"
                            min="1"
                          />
                          <span className="text-gray-500 dark:text-gray-400 ml-1">ms</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFrame(animIndex, frameIndex)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {animation.frames.length === 0 && (
                    <p className="text-gray-500 text-sm italic">Nessun frame aggiunto</p>
                  )}
                </div>
              ))}
              
              {(!formData.animations || formData.animations.length === 0) && (
                <p className="text-gray-500 text-sm italic">Nessuna animazione definita</p>
              )}
            </div>
            {/* TODO: Aggiungere altri campi specifici per Character */}
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Altri campi specifici per i Character verranno aggiunti qui...
            </p>
                        
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