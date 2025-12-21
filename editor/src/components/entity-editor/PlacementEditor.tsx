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
  const [cursorImageUrl, setCursorImageUrl] = useState<string | null>(null);
  const [naturalImageSize, setNaturalImageSize] = useState<{ width: number; height: number } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Nuovi stati per la modifica del punto di interazione
  const [editingSpotFor, setEditingSpotFor] = useState<{ entityId: string; type: 'Item' | 'Character' } | null>(null);
  const [isDraggingSpot, setIsDraggingSpot] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const hiddenImageRef = useRef<HTMLImageElement>(null);

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
        imgSrc = (charEntity?.details as { mapSprite?: string })?.mapSprite || charEntity?.details?.imageData;
      }
      setCursorImageUrl(imgSrc || null);
      setEditingSpotFor(null); // Esci dalla modalità di modifica dello spot se si seleziona una nuova entità da piazzare
    } else {
      setCursorImageUrl(null);
    }
  }, [selectedEntityIdToPlace, selectedEntityTypeToPlace, allItems, allCharacters]);

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingSpot) return;
    if (editingSpotFor) {
      setEditingSpotFor(null);
      return;
    }
    if (!selectedEntityIdToPlace || !selectedEntityTypeToPlace || !contentWrapperRef.current || !naturalImageSize) return;

    const rect = contentWrapperRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Converti in coordinate intere (pixel) relative all'immagine naturale
    // Clamping per assicurarsi che siano entro i limiti dell'immagine
    const x = Math.round(Math.max(0, Math.min(naturalImageSize.width, clickX)));
    const y = Math.round(Math.max(0, Math.min(naturalImageSize.height, clickY)));

    const newPosition = { x, y }; // Ora sono coordinate pixel intere

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
    if (editingSpotFor?.entityId === idToRemove && editingSpotFor?.type === type) {
      setEditingSpotFor(null); // Deseleziona se stiamo modificando lo spot dell'entità rimossa
    }
    if (type === 'Item') {
        setPlacedObjects(prev => prev.filter(p => p.entityId !== idToRemove));
    } else {
        setPlacedCharacters(prev => prev.filter(p => p.entityId !== idToRemove));
    }
  };

  // --- Logica per trascinare l'InteractionSpot ---
  const handleInteractionSpotMouseDown = (e: React.MouseEvent, entityId: string, type: 'Item' | 'Character') => {
    e.stopPropagation(); // Evita che il click si propaghi al map click
    setEditingSpotFor({ entityId, type });
    setIsDraggingSpot(true);
    // Deseleziona qualsiasi entità in attesa di essere piazzata
    setSelectedEntityIdToPlace(null);
    setSelectedEntityTypeToPlace(null);
  };

  const handleMouseMoveForSpotDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!contentWrapperRef.current || !naturalImageSize) return;

    const rect = contentWrapperRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Aggiorna posizione cursore per preview
    if (selectedEntityIdToPlace && !isDraggingSpot && !editingSpotFor) {
      setCursorPosition({ x: mouseX, y: mouseY });
    }

    if (!isDraggingSpot || !editingSpotFor) return;

    const clickX = mouseX;
    const clickY = mouseY;

    // Converti in coordinate intere (pixel) e applica clamping
    const newX = Math.round(Math.max(0, Math.min(naturalImageSize.width, clickX)));
    const newY = Math.round(Math.max(0, Math.min(naturalImageSize.height, clickY)));
    const newSpot = { x: newX, y: newY }; // Ora sono coordinate pixel intere

    if (editingSpotFor.type === 'Item') {
      setPlacedObjects(prev =>
        prev.map(p => p.entityId === editingSpotFor.entityId ? { ...p, interactionSpot: newSpot } : p)
      );
    } else {
      setPlacedCharacters(prev =>
        prev.map(p => p.entityId === editingSpotFor.entityId ? { ...p, interactionSpot: newSpot } : p)
      );
    }
  };

  const handleMouseUpForSpotDrag = () => {
    if (isDraggingSpot) {
      setIsDraggingSpot(false);
      // Non deselezionare editingSpotFor qui, l'utente potrebbe voler fare piccoli aggiustamenti
      // Si deseleziona cliccando sulla mappa o selezionando un'altra entità da piazzare
    }
  };
  // Aggiungiamo il mouseMove e mouseUp al wrapper del contenuto per gestire il drag
  // Nota: potremmo volerli globali (window) se il drag può uscire dall'area.
  // Per ora li teniamo sul contentWrapperRef.

  return (
    <div className="flex flex-col h-full" onMouseUp={handleMouseUpForSpotDrag} /* Aggiunto mouseup qui per terminare drag */ >
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
        {editingSpotFor && (
             <p className="text-sm mt-2 text-blue-600 dark:text-blue-400">Editing interaction spot for: <span className="font-bold">{getEntityNameById(editingSpotFor.entityId, editingSpotFor.type)}</span>. Drag the green circle.</p>
        )}
      </div>

      <div 
        className="flex-grow relative border rounded-md overflow-auto bg-gray-200 dark:bg-gray-800"
        ref={scrollContainerRef}
        style={isDraggingSpot ? {cursor: 'grabbing'} : { cursor: 'crosshair' }}
      >
        <div 
          ref={contentWrapperRef} 
          onClick={handleMapClick} 
          onMouseMove={handleMouseMoveForSpotDrag} // Aggiunto mouseMove qui
          // onMouseUp={handleMouseUpForSpotDrag} // Rimosso da qui, gestito a livello superiore o globale
          className="relative"
          style={naturalImageSize ? {
            width: `${naturalImageSize.width}px`,
            height: `${naturalImageSize.height}px`,
            margin: 'auto',
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
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                {locationImageUrl ? 'Loading background...' : 'No background image available.'}
              </p>
            </div>
          )}

          {/* Oggetti Piazzati */} 
          {naturalImageSize && placedObjects.map((obj, index) => {
            const itemEntity = allItems.find(i => i.id === obj.entityId);
            const imgSrc = itemEntity?.details?.inventoryImageData || itemEntity?.details?.imageData || 'https://via.placeholder.com/30?text=I';
            const isEditingThisSpot = editingSpotFor?.entityId === obj.entityId && editingSpotFor?.type === 'Item';
            return (
              <React.Fragment key={`placedItemFrag-${obj.entityId}-${index}`}>
                {/* Icona dell'Item */}
                <div
                  title={`${itemEntity?.name || 'Unknown Item'} (Item) - Click to remove. Drag green circle to set interaction spot.`}
                  className={`absolute cursor-pointer ${isEditingThisSpot ? 'border-2 border-blue-500 rounded' : ''}`}
                  style={{ left: `${obj.position.x}px`, top: `${obj.position.y}px` }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isEditingThisSpot) { setEditingSpotFor(null); return; }
                    handleRemovePlacedEntity(obj.entityId, 'Item'); 
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {imgSrc && <img src={imgSrc} alt={itemEntity?.name || obj.entityId} className="max-w-full max-h-full object-contain pointer-events-none" />}
                  {!imgSrc && (itemEntity?.name || obj.entityId).substring(0,1)}
                </div>
                {/* Indicatore InteractionSpot per l'Item */}
                <div 
                  title={`Interaction spot for ${itemEntity?.name || 'Unknown Item'}`}
                  className={`absolute w-4 h-4 rounded-full cursor-grab ${isEditingThisSpot && isDraggingSpot ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'} border-2 border-white shadow-md`}
                  style={{ 
                    left: `${obj.interactionSpot.x}px`, 
                    top: `${obj.interactionSpot.y}px`, 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10 // Assicura che sia sopra l'icona principale
                  }}
                  onMouseDown={(e) => handleInteractionSpotMouseDown(e, obj.entityId, 'Item')}
                />
              </React.Fragment>
            );
          })}

          {/* Personaggi Piazzati */} 
          {naturalImageSize && placedCharacters.map((char, index) => {
            const charEntity = allCharacters.find(c => c.id === char.entityId);
            const isEditingThisSpot = editingSpotFor?.entityId === char.entityId && editingSpotFor?.type === 'Character';
            return (
              <React.Fragment key={`placedCharFrag-${char.entityId}-${index}`}>
                {/* Icona del Personaggio */}
                <div
                  title={`${charEntity?.name || 'Unknown Character'} (Character) - Click to remove. Drag green circle to set interaction spot.`}
                  className={`absolute cursor-pointer ${isEditingThisSpot ? 'border-2 border-blue-500 rounded' : ''}`}
                  style={{ left: `${char.position.x}px`, top: `${char.position.y}px` }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if (isEditingThisSpot) { setEditingSpotFor(null); return; }
                    handleRemovePlacedEntity(char.entityId, 'Character'); 
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {(charEntity?.details as { mapSprite?: string })?.mapSprite && charEntity ? 
                    <img src={(charEntity.details as { mapSprite?: string }).mapSprite} alt={charEntity.name} className="max-w-full max-h-full object-contain pointer-events-none" /> : 
                    (charEntity?.name || char.entityId).substring(0,1)
                  } 
                </div>
                {/* Indicatore InteractionSpot per il Personaggio */}
                <div 
                  title={`Interaction spot for ${charEntity?.name || 'Unknown Character'}`}
                  className={`absolute w-4 h-4 rounded-full cursor-grab ${isEditingThisSpot && isDraggingSpot ? 'bg-green-700' : 'bg-green-500 hover:bg-green-600'} border-2 border-white shadow-md`}
                  style={{ 
                    left: `${char.interactionSpot.x}px`, 
                    top: `${char.interactionSpot.y}px`, 
                    transform: 'translate(-50%, -50%)',
                    zIndex: 10 // Assicura che sia sopra l'icona principale
                  }}
                  onMouseDown={(e) => handleInteractionSpotMouseDown(e, char.entityId, 'Character')}
                />
              </React.Fragment>
            );
          })}

          {/* Preview immagine che segue il cursore */}
          {cursorImageUrl && cursorPosition && selectedEntityIdToPlace && !editingSpotFor && (
            <div
              className="absolute pointer-events-none"
              style={{ 
                left: `${cursorPosition.x}px`, 
                top: `${cursorPosition.y}px`,
                opacity: 0.7,
                zIndex: 1000
              }}
            >
              <img src={cursorImageUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Click on an item/character icon on the map to remove it. Drag the green circle to set its interaction spot. Coordinates are top-left corner (engine compatible).
      </div>
    </div>
  );
};