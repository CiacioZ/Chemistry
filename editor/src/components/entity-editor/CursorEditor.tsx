'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, ChangeEvent } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, CursorEntity, Animation, AnimationFrame } from '../flow-diagram/types/index';
import { v4 as uuidv4 } from 'uuid';

interface CursorData {
  id: string;
  name: string;
  animations: Animation[];
}

export const CursorEditor: React.FC = () => {
  const { entities, setEntities } = useDiagramContext();

  // Filtra le entità per ottenere solo i Cursor
  const graphCursors = useMemo(() => {
    return entities.filter((entity: Entity): entity is CursorEntity => entity.type === 'Cursor' && entity.internal === false );
  }, [entities]);

  const [selectedCursorId, setSelectedCursorId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CursorData>>({});
  const isInitialDataLoad = useRef(false);
  const [selectedAnimationIndex, setSelectedAnimationIndex] = useState<number | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  // Ref per input file frame
  const frameFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFrameAnimationIndex, setPendingFrameAnimationIndex] = useState<number | null>(null);
  const [pendingFrameIndex, setPendingFrameIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedCursorId) {
      const selectedEntity = graphCursors.find((cursor: CursorEntity) => cursor.id === selectedCursorId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          animations: selectedEntity.details?.animations || [],
        });
      } else {
        setSelectedCursorId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedCursorId, graphCursors]);

  useEffect(() => {
    if (isInitialDataLoad.current) {
      isInitialDataLoad.current = false;
      return;
    }
    if (!selectedCursorId || !formData.id) {
      return;
    }
    const cursorIdToUpdate = selectedCursorId;
    const newName = formData.name;
    if (newName) {
      const isNameTaken = entities.some(e => e.type === 'Cursor' && e.name === newName && e.id !== cursorIdToUpdate);
      if (isNameTaken) {
        alert(`Il nome del cursore "${newName}" è già in uso. Modifica del nome annullata.`);
        const originalCursor = entities.find(e => e.id === cursorIdToUpdate);
        setFormData(prev => ({ ...prev, name: originalCursor?.name || '' }));
        return;
      }
    }
    const newEntitiesValue: Entity[] = entities.map((entity: Entity) => {
      if (entity.id === cursorIdToUpdate && entity.type === 'Cursor') {
        const currentEntity = entity as CursorEntity;
        return {
          ...currentEntity,
          id: currentEntity.id,
          name: formData.name || currentEntity.name,
          details: {
            ...(currentEntity.details || {}),
            animations: formData.animations || [],
          },
        };
      }
      return entity;
    });
    if (JSON.stringify(entities) !== JSON.stringify(newEntitiesValue)) {
      setEntities(newEntitiesValue);
    }
  }, [formData, selectedCursorId, setEntities, entities]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData: Partial<CursorData>) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSelectCursor = (id: string) => {
    setSelectedCursorId(id);
    setSelectedAnimationIndex(null);
    setSelectedFrameIndex(null);
  };

  const handleCreateCursor = () => {
    const newGuid = uuidv4();
    const baseNewName = "NewCursor";
    let newName = baseNewName;
    let counter = 1;
    while (entities.some((e: Entity) => e.name === newName && e.type === 'Cursor')) {
        newName = `${baseNewName}_${counter}`;
        counter++;
    }
    const newCursor: CursorEntity = {
        id: newGuid,
        type: 'Cursor',
        name: newName,
        internal: false,
        details: {
            animations: [],
        }
    };
    setEntities((prevEntities: Entity[]) => [...prevEntities, newCursor]);
    setSelectedCursorId(newGuid);
  };

  const handleDeleteCursor = useCallback((cursorIdToDelete: string) => {
    if (window.confirm(`Sei sicuro di voler cancellare il cursore? Questa azione non può essere annullata.`)) {
      const newEntities = entities.filter((entity: Entity) => entity.id !== cursorIdToDelete);
      setEntities(newEntities);
      if (selectedCursorId === cursorIdToDelete) {
        setSelectedCursorId(null);
        setFormData({});
      }
    }
  }, [selectedCursorId, setEntities, entities]);

  // Animazioni
  const handleAddAnimation = () => {
    setFormData((prev: Partial<CursorData>) => ({
      ...prev,
      animations: [...(prev.animations || []), { name: `Animazione ${((prev.animations || []).length + 1)}`, frames: [], loop: false }],
    }));
  };

  const handleDeleteAnimation = (index: number) => {
    setFormData((prev: Partial<CursorData>) => ({
      ...prev,
      animations: (prev.animations || []).filter((_: unknown, i: number) => i !== index),
    }));
    setSelectedAnimationIndex(null);
    setSelectedFrameIndex(null);
  };

  const handleAnimationNameChange = (index: number, newName: string) => {
    setFormData((prev: Partial<CursorData>) => ({
      ...prev,
      animations: (prev.animations || []).map((anim: Animation, i: number) => i === index ? { ...anim, name: newName } : anim),
    }));
  };

  // Funzione per aggiungere un nuovo frame (come prima)
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
      setFormData((prev: Partial<CursorData>) => ({
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
    setFormData((prev: Partial<CursorData>) => ({
      ...prev,
      animations: (prev.animations || []).map((anim: Animation, i: number) => i === animationIndex ? { ...anim, frames: anim.frames.filter((_: unknown, j: number) => j !== frameIndex) } : anim),
    }));
  };

  const handleFrameDurationChange = (animationIndex: number, frameIndex: number, duration: number) => {
    setFormData((prev: Partial<CursorData>) => ({
      ...prev,
      animations: (prev.animations || []).map((anim: Animation, i: number) => i === animationIndex ? {
        ...anim,
        frames: anim.frames.map((frame: AnimationFrame, j: number) => j === frameIndex ? { ...frame, duration } : frame),
      } : anim),
    }));
  };

  // Render
  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista dei Cursori */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Cursori</h3>
          <button 
            onClick={handleCreateCursor}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            + New Cursor
          </button>
        </div>
        <ul>
          {graphCursors.map((cursor: CursorEntity) => (
            <li
              key={cursor.id}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedCursorId === cursor.id ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectCursor(cursor.id)} className="flex-grow">
                {cursor.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCursor(cursor.id);
                }}
                className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 focus:outline-none"
                aria-label={`Delete ${cursor.name}`}
                title={`Delete ${cursor.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Cursor */}
      <div className="w-2/3 flex flex-col space-y-4 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Cursor Details</h2>
        {selectedCursorId && formData.id ? (
          <>
            <form className="space-y-4 pt-2" onSubmit={(e) => e.preventDefault()}>
              {/* ID (GUID) - Read-only */}
              <div className="mb-4">
                <label htmlFor="cursorId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cursor ID (GUID - Read-only)
                </label>
                <input
                  type="text"
                  id="cursorId"
                  name="id"
                  value={formData.id || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
                />
              </div>
              {/* Name */}
              <div className="mb-4">
                <label htmlFor="cursorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="cursorName"
                  name="name"
                  value={formData.name || ''}
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

                {(formData.animations && formData.animations.length > 0) ? (
                  formData.animations.map((animation: Animation, animIndex: number) => (
                    <div 
                      key={animIndex} 
                      className={`border rounded p-3 mb-3 ${selectedAnimationIndex === animIndex ? 'bg-blue-100 dark:bg-blue-700 ring-2 ring-blue-500' : 'bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <input
                          type="text"
                          value={animation.name}
                          onClick={(e: React.MouseEvent<HTMLInputElement>) => {
                            e.stopPropagation();
                            setSelectedAnimationIndex(animIndex);
                            setSelectedFrameIndex(null);
                          }}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            e.stopPropagation(); 
                            handleAnimationNameChange(animIndex, e.target.value);
                          }}
                          className="font-medium bg-transparent border-b border-gray-400 dark:border-gray-500 focus:outline-none focus:border-blue-500 dark:text-white w-full mr-2 cursor-text"
                          placeholder="Nome Animazione"
                        />
                        <div 
                          onClick={() => {
                              setSelectedAnimationIndex(animIndex);
                              setSelectedFrameIndex(null);
                          }}
                          className="flex-grow h-full cursor-pointer"
                        ></div>
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation();
                            handleDeleteAnimation(animIndex);
                          }}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-700/30 ml-2"
                          title="Elimina Animazione"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>

                      <div className="mb-2 mt-1">
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.stopPropagation(); 
                            handleAddFrame(animIndex);
                            setSelectedAnimationIndex(animIndex);
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
                            onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                        >
                          {animation.frames.map((frame: { imageData: string; duration?: number }, frameIndex: number) => (
                            <div 
                              key={frameIndex} 
                              className={`relative border rounded p-1 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer
                                          ${selectedAnimationIndex === animIndex && selectedFrameIndex === frameIndex ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-800/50' : 'bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500/50'}`}
                              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                e.stopPropagation();
                                setSelectedAnimationIndex(animIndex);
                                setSelectedFrameIndex(frameIndex);
                                handleReplaceFrameImage(animIndex, frameIndex);
                              }}
                            >
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-500 rounded mb-1 flex items-center justify-center overflow-hidden">
                                {frame.imageData ? (
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
                                ) : (
                                  <span className="text-xs text-gray-400">No Img</span>
                                )}
                              </div>
                              <div className="flex items-center my-0.5">
                                <input
                                  type="number"
                                  value={frame.duration}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    e.stopPropagation();
                                    handleFrameDurationChange(animIndex, frameIndex, parseInt(e.target.value, 10));
                                  }}
                                  onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                                  className="w-12 text-center px-0.5 py-0 border border-gray-300 dark:border-gray-500 rounded text-xs dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                  min="1"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">ms</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
                        <div onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} className="cursor-default">
                           <p className="text-gray-500 dark:text-gray-400 text-xs italic mt-2 py-1 px-2 rounded bg-gray-100 dark:bg-gray-700/50 text-center">
                            Nessun frame. Clicca "+ Aggiungi Frame".
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm italic">Nessuna animazione definita per questo cursore.</p>
                )}
              </div>

              {/* Bottoni Azioni */}
              <div className="flex justify-end space-x-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => handleDeleteCursor(selectedCursorId!)}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  disabled={!selectedCursorId}
                >
                  Delete Cursor
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a cursor from the list to view or edit its details, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}; 