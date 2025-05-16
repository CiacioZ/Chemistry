'use client';

import React, { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react'; // Aggiungi Dispatch e SetStateAction
import { Entity, ItemEntity, CharacterEntity, LocationEntity, PlacedEntity } from '../flow-diagram/types'; // Assicurati che PlacedEntity sia definito in types.ts

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
  
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Effetto per aggiornare lo stato globale quando placedObjects o placedCharacters cambiano
  useEffect(() => {
    setEntities((prevEntities: Entity[]) => 
      prevEntities.map((entity: Entity) => { 
        if (entity.type === 'Location' && entity.name === locationId) {
          return {
            ...entity,
            details: {
              ...(entity.details || {}), 
              placedItems: placedObjects, // Modificato da placedItems per coerenza
              placedCharacters: placedCharacters,
            }
          } as LocationEntity;
        }
        return entity;
      })
    );
  }, [placedObjects, placedCharacters, locationId, setEntities]);


  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedEntityIdToPlace || !selectedEntityTypeToPlace || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newPosition = { x, y };

    if (selectedEntityTypeToPlace === 'Item') {
      setPlacedObjects(prev => {
        const existingIndex = prev.findIndex(p => p.entityId === selectedEntityIdToPlace);
        if (existingIndex !== -1) {
          // Aggiorna la posizione dell'oggetto esistente
          return prev.map((p, index) => 
            index === existingIndex ? { ...p, position: newPosition, interactionSpot: newPosition } : p
          );
        } else {
          // Aggiungi il nuovo oggetto
          const newPlacedEntity: PlacedEntity = { entityId: selectedEntityIdToPlace, position: newPosition, interactionSpot: newPosition };
          return [...prev, newPlacedEntity];
        }
      });
    } else if (selectedEntityTypeToPlace === 'Character') {
      setPlacedCharacters(prev => {
        const existingIndex = prev.findIndex(p => p.entityId === selectedEntityIdToPlace);
        if (existingIndex !== -1) {
          // Aggiorna la posizione del personaggio esistente
          return prev.map((p, index) => 
            index === existingIndex ? { ...p, position: newPosition, interactionSpot: newPosition } : p
          );
        } else {
          // Aggiungi il nuovo personaggio
          const newPlacedEntity: PlacedEntity = { entityId: selectedEntityIdToPlace, position: newPosition, interactionSpot: newPosition };
          return [...prev, newPlacedEntity];
        }
      });
    }
  };

  const getEntityNameById = (id: string, type: 'Item' | 'Character'): string => {
    const list = type === 'Item' ? allItems : allCharacters;
    const entity = list.find(e => e.name === id);
    return entity?.name || 'Unknown';
  };

  const handleRemovePlacedEntity = (idToRemove: string, type: 'Item' | 'Character') => {
    if (type === 'Item') {
        // Con il posizionamento unico, possiamo semplificare la rimozione
        setPlacedObjects(prev => prev.filter(p => p.entityId !== idToRemove));
    } else {
        setPlacedCharacters(prev => prev.filter(p => p.entityId !== idToRemove));
    }
  };


  return (
    <div className="flex flex-col h-full">
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
                <option key={item.name} value={item.name}>{item.name}</option>
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
                <option key={char.name} value={char.name}>{char.name}</option>
              ))}
            </select>
          </div>
        </div>
        {selectedEntityIdToPlace && (
            <p className="text-sm mt-2 dark:text-gray-300">Selected: <span className="font-bold">{selectedEntityIdToPlace} ({selectedEntityTypeToPlace})</span>. Click on the map to place.</p>
        )}
      </div>

      <div className="flex-grow relative border rounded-md overflow-hidden" ref={imageContainerRef} onClick={handleMapClick}>
        {locationImageUrl ? (
          <img src={locationImageUrl} alt={`Background for ${locationId}`} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No background image available for this location.</p>
          </div>
        )}
        {/* Visualizza Oggetti Piazzati */}
        {placedObjects.map((obj, index) => {
          const itemEntity = allItems.find(i => i.name === obj.entityId);
          const imgSrc = itemEntity?.details?.inventoryImageData || itemEntity?.details?.imageData || 'https://via.placeholder.com/30?text=I'; // Fallback
          return (
            <div
              key={`obj-${obj.entityId}-${index}`} // L'index non è più strettamente necessario per la chiave se entityId è unico, ma lo teniamo per ora
              title={`${getEntityNameById(obj.entityId, 'Item')} (Item)`}
              className="absolute w-8 h-8 flex items-center justify-center text-xs cursor-pointer" // Rimosso bg-blue-500/70 border border-blue-700 rounded
              style={{ left: `${obj.position.x}%`, top: `${obj.position.y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={(e) => { e.stopPropagation(); handleRemovePlacedEntity(obj.entityId, 'Item'); }}
            >
              {imgSrc && <img src={imgSrc} alt={obj.entityId} className="max-w-full max-h-full object-contain" />}
              {!imgSrc && obj.entityId.substring(0,1)}
            </div>
          );
        })}
        {/* Visualizza Personaggi Piazzati */}
        {placedCharacters.map((char, index) => {
          const charEntity = allCharacters.find(c => c.name === char.entityId);
          // const imgSrc = charEntity?.details?.mapSprite || 'https://via.placeholder.com/30?text=C'; 
          return (
            <div
              key={`char-${char.entityId}-${index}`} // L'index non è più strettamente necessario
              title={`${getEntityNameById(char.entityId, 'Character')} (Character)`}
              className="absolute w-8 h-8 flex items-center justify-center text-xs cursor-pointer" // Rimosso bg-green-500/70 border border-green-700 rounded-full
              style={{ left: `${char.position.x}%`, top: `${char.position.y}%`, transform: 'translate(-50%, -50%)' }}
              onClick={(e) => { e.stopPropagation(); handleRemovePlacedEntity(char.entityId, 'Character'); }}
            >
              {/* Se hai un'immagine per il personaggio, visualizzala qui */}
              {/* Esempio: charEntity?.details?.mapSprite ? <img src={charEntity.details.mapSprite} ... /> : char.entityId.substring(0,1) */}
              {char.entityId.substring(0,1)} 
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Click on an item/character icon on the map to remove it. Coordinates are saved as percentages.
      </div>
    </div>
  );
};