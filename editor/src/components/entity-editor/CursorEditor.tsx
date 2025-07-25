'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, ChangeEvent } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, CursorEntity, Animation } from '../flow-diagram/types/index';
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

  const handleAddFrame = (animationIndex: number) => {
    setFormData((prev: Partial<CursorData>) => ({
      ...prev,
      animations: (prev.animations || []).map((anim: Animation, i: number) => i === animationIndex ? { ...anim, frames: [...anim.frames, { imageData: '', duration: 100 }] } : anim),
    }));
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
        frames: anim.frames.map((frame: { duration?: number }, j: number) => j === frameIndex ? { ...frame, duration } : frame),
      } : anim),
    }));
  };

  // Render
  return (
    <div className="flex flex-row gap-6">
      {/* Lista cursori */}
      <div className="w-1/4 bg-white dark:bg-gray-800 rounded shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-bold text-lg">Cursori</h2>
          <button onClick={handleCreateCursor} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">+ Nuovo</button>
        </div>
        <ul>
          {graphCursors.map((cursor: CursorEntity) => (
            <li
              key={cursor.id}
              className={`p-2 rounded cursor-pointer mb-1 ${selectedCursorId === cursor.id ? 'bg-blue-100 dark:bg-blue-900 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              onClick={() => handleSelectCursor(cursor.id)}
            >
              {cursor.name}
            </li>
          ))}
        </ul>
      </div>
      {/* Form cursore selezionato */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded shadow p-4">
        {selectedCursorId && formData ? (
          <>
            <form className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Nome</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e)}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                />
              </div>
              {/* Animazioni */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold">Animazioni</label>
                  <button type="button" onClick={handleAddAnimation} className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs">+ Aggiungi Animazione</button>
                </div>
                {(formData.animations && formData.animations.length > 0) ? (
                  formData.animations.map((animation: Animation, animIndex: number) => (
                    <div key={animIndex} className={`mb-4 p-2 rounded border ${selectedAnimationIndex === animIndex ? 'border-blue-400' : 'border-gray-200 dark:border-gray-600'}`}
                      onClick={() => { setSelectedAnimationIndex(animIndex); setSelectedFrameIndex(null); }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={animation.name}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleAnimationNameChange(animIndex, e.target.value)}
                          className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                        <button type="button" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleDeleteAnimation(animIndex); }} className="text-red-500 hover:text-red-700 text-xs ml-2">Elimina</button>
                        <button type="button" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleAddFrame(animIndex); }} className="text-green-500 hover:text-green-700 text-xs ml-2">+ Frame</button>
                      </div>
                      {/* Lista frame */}
                      {animation.frames.length > 0 ? (
                        <div className="flex flex-row gap-2 flex-wrap">
                          {animation.frames.map((frame: { imageData: string; duration?: number }, frameIndex: number) => (
                            <div key={frameIndex} className={`relative border rounded p-1 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedAnimationIndex === animIndex && selectedFrameIndex === frameIndex ? 'ring-2 ring-indigo-500 bg-indigo-100 dark:bg-indigo-800/50' : 'bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500/50'}`}
                              onClick={(e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); setSelectedAnimationIndex(animIndex); setSelectedFrameIndex(frameIndex); }}
                            >
                              <div className="w-20 h-20 bg-gray-200 dark:bg-gray-500 rounded mb-1 flex items-center justify-center overflow-hidden">
                                {frame.imageData ? (
                                  <img src={frame.imageData} alt={`Frame ${frameIndex + 1}`} className="w-full h-full object-contain" />
                                ) : (
                                  <span className="text-xs text-gray-400">No Img</span>
                                )}
                              </div>
                              <div className="flex items-center my-0.5">
                                <input
                                  type="number"
                                  value={frame.duration}
                                  onChange={(e: ChangeEvent<HTMLInputElement>) => { e.stopPropagation(); handleFrameDurationChange(animIndex, frameIndex, parseInt(e.target.value, 10)); }}
                                  onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                                  className="w-12 text-center px-0.5 py-0 border border-gray-300 dark:border-gray-500 rounded text-xs dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                  min="1"
                                />
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-0.5">ms</span>
                              </div>
                              <button type="button" onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); handleDeleteFrame(animIndex, frameIndex); }} className="absolute top-0 right-0 text-red-500 hover:text-red-600 dark:text-red-300 dark:hover:text-red-200 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-700/40 focus:outline-none" title="Delete Frame">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.8" stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()} className="cursor-default">
                          <p className="text-gray-500 dark:text-gray-400 text-xs italic mt-2 py-1 px-2 rounded bg-gray-100 dark:bg-gray-700/50 text-center">Nessun frame. Clicca "+ Frame".</p>
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
                <button type="button" onClick={() => handleDeleteCursor(selectedCursorId!)} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600" disabled={!selectedCursorId}>Elimina Cursore</button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Seleziona un cursore dalla lista per modificarlo, oppure creane uno nuovo.
          </div>
        )}
      </div>
    </div>
  );
}; 