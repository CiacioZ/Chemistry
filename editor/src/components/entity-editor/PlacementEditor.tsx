'use client';

import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react'; // Aggiungi Dispatch e SetStateAction
import { Entity, ItemEntity, CharacterEntity, LocationEntity, PlacedEntity } from '../flow-diagram/types/index'; // Assicurati che PlacedEntity sia definito in types.ts

interface PlacementEditorProps {
  locationId: string;
  locationImageUrl: string | null;
  initialPlacedObjects: PlacedEntity[]; // Array di oggetti piazzati { entityId: string, x: number, y: number }
  initialPlacedCharacters: PlacedEntity[]; // Array di personaggi piazzati
  allItems: ItemEntity[]; // Lista di tutti gli item disponibili per il piazzamento
  allCharacters: CharacterEntity[]; // Lista di tutti i personaggi disponibili
  entities: Entity[]; // L'array completo delle entità per trovare i dettagli se necessario
  setEntities: Dispatch<SetStateAction<Entity[]>>; // Tipo aggiornato per setEntities
}

export const PlacementEditor: React.FC<PlacementEditorProps> = ({
  locationId,
  locationImageUrl,
  initialPlacedObjects,
  initialPlacedCharacters,
  allItems,
  allCharacters,
  setEntities,
}) => {
  const [placedObjects, setPlacedObjects] = useState<PlacedEntity[]>(initialPlacedObjects);
  const [placedCharacters, setPlacedCharacters] = useState<PlacedEntity[]>(initialPlacedCharacters);
  const [selectedEntityTypeToPlace, setSelectedEntityTypeToPlace] = useState<'Item' | 'Character' | null>(null);
  const [selectedEntityIdToPlace, setSelectedEntityIdToPlace] = useState<string | null>(null);
  const [cursorImageUrl, setCursorImageUrl] = useState<string | null>(null); // Stato per l'URL dell'immagine del cursore
  const [naturalImageSize, setNaturalImageSize] = useState<{ width: number; height: number } | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Ex imageContainerRef, ora per lo scroll
  const contentWrapperRef = useRef<HTMLDivElement>(null); // Nuovo div per contenuto a dimensione naturale
  const hiddenImageRef = useRef<HTMLImageElement>(null); // Per caricare e ottenere dimensioni naturali

  // Effetto per caricare le dimensioni naturali dell'immagine di background
  useEffect(() => {
    if (locationImageUrl && hiddenImageRef.current) {
      hiddenImageRef.current.src = locationImageUrl;
    } else {
      setNaturalImageSize(null); // Resetta se non c'è URL
    }
  }, [locationImageUrl]);

  const handleHiddenImageLoad = () => {
    if (hiddenImageRef.current) {
      setNaturalImageSize({
        width: hiddenImageRef.current.naturalWidth,
        height: hiddenImageRef.current.naturalHeight,
      });
    }
  };

  // Effetto per aggiornare lo stato globale quando placedObjects o placedCharacters cambiano
  useEffect(() => {
    setEntities((prevEntities: Entity[]) => 
      prevEntities.map((entity: Entity) => { 
        if (entity.type === 'Location' && entity.id === locationId) {
          return {
            ...entity,
            details: {
              ...(entity.details || {}), 
              placedItems: placedObjects,
              placedCharacters: placedCharacters,
            }
          } as LocationEntity;
        }
        return entity;
      })
    );
  }, [placedObjects, placedCharacters, locationId, setEntities]);

  // Effetto per aggiornare l'immagine del cursore quando un'entità viene selezionata
  useEffect(() => {
    if (selectedEntityIdToPlace && selectedEntityTypeToPlace) {
      let imgSrc: string | undefined | null = null;
      if (selectedEntityTypeToPlace === 'Item') {
        const itemEntity = allItems.find(i => i.id === selectedEntityIdToPlace);
        imgSrc = itemEntity?.details?.inventoryImageData || itemEntity?.details?.imageData;
      } else if (selectedEntityTypeToPlace === 'Character') {
        const charEntity = allCharacters.find(c => c.id === selectedEntityIdToPlace);
        imgSrc = (charEntity?.details as any)?.mapSprite || charEntity?.details?.imageData;
      }
      setCursorImageUrl(imgSrc || null);
    } else {
      setCursorImageUrl(null);
    }
  }, [selectedEntityIdToPlace, selectedEntityTypeToPlace, allItems, allCharacters]);


  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedEntityIdToPlace || !selectedEntityTypeToPlace || !contentWrapperRef.current || !naturalImageSize) return;

    const rect = contentWrapperRef.current.getBoundingClientRect();
    // Calcola coordinate relative al contentWrapperRef (che ha dimensioni naturali)
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Converti in percentuale delle dimensioni naturali
    const x = (clickX / naturalImageSize.width) * 100;
    const y = (clickY / naturalImageSize.height) * 100;

    const newPosition = { x, y };

    if (selectedEntityTypeToPlace === 'Item') {
      setPlacedObjects(prev => {
        const existingIndex = prev.findIndex(p => p.entityId === selectedEntityIdToPlace);
        if (existingIndex !== -1) {
          return prev.map((p, index) => 
            index === existingIndex ? { ...p, position: newPosition, interactionSpot: newPosition } : p
          );
        } else {
          const newPlacedEntity: PlacedEntity = { entityId: selectedEntityIdToPlace, position: newPosition, interactionSpot: newPosition };
          return [...prev, newPlacedEntity];
        }
      });
    } else if (selectedEntityTypeToPlace === 'Character') {
      setPlacedCharacters(prev => {
        const existingIndex = prev.findIndex(p => p.entityId === selectedEntityIdToPlace);
        if (existingIndex !== -1) {
          return prev.map((p, index) => 
            index === existingIndex ? { ...p, position: newPosition, interactionSpot: newPosition } : p
          );
        } else {
          const newPlacedEntity: PlacedEntity = { entityId: selectedEntityIdToPlace, position: newPosition, interactionSpot: newPosition };
          return [...prev, newPlacedEntity];
        }
      });
    }
  };

  const getEntityNameById = (id: string, type: 'Item' | 'Character'): string => {
    const list = type === 'Item' ? allItems : allCharacters;
    const entity = list.find(e => e.id === id);
    return entity?.name || 'Unknown';
  };

  const handleRemovePlacedEntity = (idToRemove: string, type: 'Item' | 'Character') => {
    if (type === 'Item') {
        setPlacedObjects(prev => prev.filter(p => p.entityId !== idToRemove));
    } else {
        setPlacedCharacters(prev => prev.filter(p => p.entityId !== idToRemove));
    }
  };


  return (
    <div className="flex flex-col h-full">
      {/* Immagine nascosta per caricare e ottenere dimensioni naturali */}
      <img ref={hiddenImageRef} onLoad={handleHiddenImageLoad} style={{ display: 'none' }} alt="" />

      <div className="mb-4 p-2 border rounded bg-gray-100 dark:bg-gray-700">
        <h4 className="font-semibold mb-1">Select Entity to Place:</h4>
        <div className="flex space-x-4">
          <div className="w-1/2">
            <label htmlFor="item-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item:</label>
            <select
              id="item-select"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              onChange={(e) => {
                setSelectedEntityIdToPlace(e.target.value);
                setSelectedEntityTypeToPlace(e.target.value ? 'Item' : null);
              }}
              value={selectedEntityTypeToPlace === 'Item' && selectedEntityIdToPlace ? selectedEntityIdToPlace : ""}
            >
              <option value="">-- Select Item --</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="w-1/2">
            <label htmlFor="character-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Character:</label>
            <select
              id="character-select"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              onChange={(e) => {
                setSelectedEntityIdToPlace(e.target.value);
                setSelectedEntityTypeToPlace(e.target.value ? 'Character' : null);
              }}
              value={selectedEntityTypeToPlace === 'Character' && selectedEntityIdToPlace ? selectedEntityIdToPlace : ""}
            >
              <option value="">-- Select Character --</option>
              {allCharacters.map(char => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedEntityIdToPlace && (
            <p className="text-sm mt-2 dark:text-gray-300">Selected: <span className="font-bold">{getEntityNameById(selectedEntityIdToPlace, selectedEntityTypeToPlace!)} ({selectedEntityTypeToPlace})</span>. Click on the map to place.</p>
        )}
      </div>

      {/* Contenitore scrollabile */}
      <div 
        className="flex-grow relative border rounded-md overflow-auto bg-gray-200 dark:bg-gray-800"
        ref={scrollContainerRef}
        style={cursorImageUrl && naturalImageSize ? { cursor: `url(${cursorImageUrl}) 16 16, auto` } : { cursor: 'default' }}
      >
        {/* Wrapper per contenuto a dimensione naturale, qui avviene il click */}
        <div 
          ref={contentWrapperRef} 
          onClick={handleMapClick} 
          className="relative"
          style={naturalImageSize ? {
            width: `${naturalImageSize.width}px`,
            height: `${naturalImageSize.height}px`,
            margin: 'auto', // Centra se il contenitore scrollabile è più grande
          } : {
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {locationImageUrl && naturalImageSize ? (
            <img 
              src={locationImageUrl} 
              alt={`Background for ${locationId}`}
              style={{
                display: 'block',
                width: `${naturalImageSize.width}px`,
                height: `${naturalImageSize.height}px`,
                // No object-fit, vogliamo dimensioni naturali
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                {locationImageUrl ? 'Loading background...' : 'No background image available.'}
              </p>
            </div>
          )}

          {/* Oggetti e Personaggi Piazzati (usano position:absolute relative a questo div) */}
          {naturalImageSize && placedObjects.map((obj, index) => {
            const itemEntity = allItems.find(i => i.id === obj.entityId);
            const imgSrc = itemEntity?.details?.inventoryImageData || itemEntity?.details?.imageData || 'https://via.placeholder.com/30?text=I';
            return (
              <div
                key={`obj-${obj.entityId}-${index}`}
                title={`${itemEntity?.name || 'Unknown Item'} (Item)`}
                className="absolute w-8 h-8 flex items-center justify-center text-xs cursor-pointer bg-black bg-opacity-20 hover:bg-opacity-50 rounded"
                style={{ left: `${obj.position.x}%`, top: `${obj.position.y}%`, transform: 'translate(-50%, -50%)' }}
                onClick={(e) => { e.stopPropagation(); handleRemovePlacedEntity(obj.entityId, 'Item'); }}
              >
                {imgSrc && <img src={imgSrc} alt={itemEntity?.name || obj.entityId} className="max-w-full max-h-full object-contain pointer-events-none" />}
                {!imgSrc && (itemEntity?.name || obj.entityId).substring(0,1)}
              </div>
            );
          })}
          {naturalImageSize && placedCharacters.map((char, index) => {
            const charEntity = allCharacters.find(c => c.id === char.entityId);
            return (
              <div
                key={`char-${char.entityId}-${index}`}
                title={`${charEntity?.name || 'Unknown Character'} (Character)`}
                className="absolute w-8 h-8 flex items-center justify-center text-xs cursor-pointer bg-black bg-opacity-20 hover:bg-opacity-50 rounded"
                style={{ left: `${char.position.x}%`, top: `${char.position.y}%`, transform: 'translate(-50%, -50%)' }}
                onClick={(e) => { e.stopPropagation(); handleRemovePlacedEntity(char.entityId, 'Character'); }}
              >
                {(charEntity?.details as any)?.mapSprite && charEntity ? 
                  <img src={(charEntity.details as any).mapSprite} alt={charEntity.name} className="max-w-full max-h-full object-contain pointer-events-none" /> : 
                  (charEntity?.name || char.entityId).substring(0,1)
                } 
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Click on an item/character icon on the map to remove it. Coordinates are saved as percentages of the natural image size.
      </div>
    </div>
  );
};