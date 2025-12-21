import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { Node, Entity, EntityType, VERBS, AnyEntity, PREDEFINED_ENTITIES, ActionNode, StateNode, NodeFlag } from '../types/index';
import { v4 as uuidv4 } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
 } from "@/components/ui/dialog";
 
 const getToEntityTypes = (verb: string): EntityType[] => {
   switch(verb) {
     case 'Talk_To': return ['Character'];
     case 'Get': return ['Item'];
     case 'Go_To': return ['Location'];
     case 'Look_At': return ['Item', 'Character'];
     case 'Use': return ['Character', 'Item'];
     case 'Move_To': return ['Location'];
     default: return ['Character'];
   }
 };
 
 interface EntityDropdownProps {
   value: string;
   onChange: (value: string) => void;
   entityTypes: EntityType[];
   entities: Entity[];
   onAddEntity: (fieldName: string, type: EntityType) => void;
   fieldName: string;
   placeholder?: string;
 }
 
 const EntityDropdown: React.FC<EntityDropdownProps> = ({
   value,
   onChange,
   entityTypes,
   entities,
   onAddEntity,
   fieldName,
   placeholder
 }) => {
   const groupedEntities = entityTypes.reduce((acc, type) => {
     const typeEntities = entities.filter(e => e.type === type);
     if (typeEntities.length > 0) {
       acc[type] = typeEntities;
     }
     return acc;
   }, {} as Record<EntityType, Entity[]>);
   
   const handleAddClick = () => {
     if (entityTypes.length === 0) return;
     
     if (fieldName === 'to' && entityTypes.length > 1 && value) {
       const selectedEntity = entities.find(e => e.id === value);
       if (selectedEntity) {
         onAddEntity(fieldName, selectedEntity.type);
         return;
       }
     }
     onAddEntity(fieldName, entityTypes[0]);
   };
 
   return (
     <div className="flex gap-2">
       <select
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
       >
         <option value="">{placeholder || `Select ${entityTypes.join('/')}`}</option>
         {Object.entries(groupedEntities).map(([type, typeEntities], index) => (
           <React.Fragment key={type}>
             {index > 0 && (
               <>
                 <option disabled>──────────</option>
                 <option disabled>{type}s</option>
               </>
             )}
             {entityTypes.length > 1 && index === 0 && (
               <option disabled>{type}s</option>
             )}
             {typeEntities.map(entity => (
               <option key={entity.id} value={entity.id}>
                 {entity.name}
               </option>
             ))}
           </React.Fragment>
         ))}
       </select>
       <button
         type="button"
         onClick={handleAddClick}
         className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
       >
         +
       </button>
     </div>
   );
 };
 
 // Funzione helper per risolvere un nome di entità (potenzialmente predefinito) al suo ID GUID
 // o restituire il valore se è già un GUID valido o non trovato.
 const resolveEntityId = (value: string | undefined, allEntities: Entity[]): string => {
   if (!value) return '';

   // Cerca prima tra le PREDEFINED_ENTITIES per nome
   const predefined = PREDEFINED_ENTITIES.find(pe => pe.name === value);
   if (predefined) return predefined.id;

   // Se non è un nome predefinito, controlla se è un ID GUID di un'entità esistente in allEntities
   // (allEntities dovrebbe includere PREDEFINED_ENTITIES per coerenza, ma PREDEFINED_ENTITIES ha la priorità per i nomi speciali)
   const existingEntityById = allEntities.find(e => e.id === value);
   if (existingEntityById) return existingEntityById.id; // È già un GUID valido
   
   // Fallback: se value è un nome non predefinito e non un GUID esistente, 
   // potrebbe essere un nome di un'entità utente. Cerchiamo per nome.
   const userEntityByName = allEntities.find(e => e.name === value && !e.internal);
   if (userEntityByName) return userEntityByName.id;

   // Se non trovato, potrebbe essere un vecchio valore o un errore, restituisce vuoto o il valore originale?
   // Per le dropdown, è meglio restituire '' per evitare di passare un valore non valido.
   // console.warn(`resolveEntityId: Could not resolve '${value}' to a valid entity ID.`);
   return ''; // O value, se si preferisce tentare di usare il valore originale
 };
 
 export const NodeDialog: React.FC<{
   node: Node | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onUpdate: (id: string, updates: Partial<Node>) => void;
   entities: Entity[];
   setEntities: Dispatch<SetStateAction<Entity[]>>;
 }> = ({
   node,
   open,
   onOpenChange,
   onUpdate,
   entities,
   setEntities
 }) => {
   const [tempValues, setTempValues] = useState<Partial<Node>>({});
 
   useEffect(() => {
     if (open && node) {
       if (node.type === 'action') {
         const actionNode = node as ActionNode;
         setTempValues({
           ...actionNode,
           from: resolveEntityId(actionNode.from || 'SOMEONE', entities),
           to: resolveEntityId(actionNode.to, entities),
           with: resolveEntityId(actionNode.with, entities),
           where: resolveEntityId(actionNode.where, entities),
         });
       } else {
         setTempValues(node); // Per StateNode o altri tipi
         // Assicurati che i flag siano inizializzati se è uno StateNode
         if (node.type === 'state') {
           const stateNode = node as StateNode;
           setTempValues(prev => ({ ...prev, flags: stateNode.flags || [] }));
         }
       }
     }
   }, [open, node]); // RIMOSSO entities dalle dipendenze
 
   const handleAddEntity = (fieldName: string, type: EntityType) => {
     if (!type) return;
     
     const name = prompt(`Enter new ${type.toLowerCase()} name:`);
     if (name) {
       if (entities.some(e => e.type === type && e.name === name)) {
         alert(`An entity of type '${type}' with the name '${name}' already exists.`);
         return;
       }

       const newEntityId = uuidv4();
       let newEntity: AnyEntity;

       switch (type) {
         case 'Character':
           newEntity = {
             id: newEntityId,
             type,
             name,
             internal: false,
             details: { description: '', imageData: '', animations: [] },
           };
           break;
         case 'Item':
           newEntity = {
             id: newEntityId,
             type,
             name,
             internal: false,
             details: { description: '', imageData: '', canBePickedUp: false, inventoryImageData: '', animations: [], useWith: false },
           };
           break;
         case 'Location':
           newEntity = {
             id: newEntityId,
             type,
             name,
             internal: false,
             details: { description: '', backgroundImage: '', walkableArea: [], placedItems: [], placedCharacters: [] },
           };
           break;
         default:
           console.error("Invalid entity type for creation:", type);
           return;
       }

       setEntities(prevEntities => [...prevEntities, newEntity]);
       setTempValues(prev => ({
         ...prev,
         [fieldName]: newEntityId
       }));
     }
   };
 
   const handleInputChange = (field: string, value: string) => {
     // Se il campo è 'verb', e cambia, potremmo dover resettare 'to' e 'with'
     // se i tipi di entità ammessi per 'to' cambiano o se 'with' non è più applicabile.
     if (field === 'verb') {
       const newToTypes = getToEntityTypes(value);
       const currentToEntity = entities.find(e => e.id === (tempValues as Partial<ActionNode>).to);
       
       let resetTo = true;
       if (currentToEntity && newToTypes.includes(currentToEntity.type)) {
         resetTo = false; // L'entità attuale è ancora valida
       }

       setTempValues(prev => ({
         ...prev,
         verb: value,
         to: resetTo ? '' : (prev as Partial<ActionNode>).to, // Resetta 'to' se il tipo non è più valido
         with: value !== 'Use' ? '' : (prev as Partial<ActionNode>).with, // Resetta 'with' se il verbo non è 'Interact with'
       }));
     } else {
       setTempValues(prev => ({
         ...prev,
         [field]: value
       }));
     }
   };
 
   const handleAddFlag = () => {
     setTempValues(prev => {
       const currentNode = prev as Partial<Node>;
       if (currentNode.type !== 'state') return currentNode; // Non dovrebbe succedere, ma per sicurezza
 
       const currentFlags = (currentNode as Partial<StateNode>).flags || [];
       const newFlags = [...currentFlags, { name: '', value: false }];
       return { ...currentNode, flags: newFlags } as Partial<StateNode>;
     });
   };

   const handleFlagChange = (index: number, field: keyof NodeFlag, value: string | boolean) => {
     setTempValues(prev => {
       const currentNode = prev as Partial<Node>; // Manteniamo Partial<Node>
       if (currentNode.type !== 'state') return currentNode;

       const currentFlags = (currentNode as Partial<StateNode>).flags || [];
       const newFlags = [...currentFlags];
       if (newFlags[index]) {
         newFlags[index] = { ...newFlags[index], [field]: value };
       }
       return { ...currentNode, flags: newFlags } as Partial<StateNode>;
     });
   };

   const handleRemoveFlag = (index: number) => {
     setTempValues(prev => {
       const currentNode = prev as Partial<Node>; // Manteniamo Partial<Node>
       if (currentNode.type !== 'state') return currentNode;

       const currentFlags = (currentNode as Partial<StateNode>).flags || [];
       const newFlags = [...currentFlags];
       newFlags.splice(index, 1);
       return { ...currentNode, flags: newFlags } as Partial<StateNode>; // Cast esplicito
     });
   };
 
   const handleDialogSave = () => {
     if (node) {
         // Prima di salvare, assicurarsi che i valori nelle dropdown siano ID GUID.
         // La EntityDropdown dovrebbe già passare ID GUID tramite onChange.
         // Se un campo potesse contenere un nome (es. da un input testuale libero che non abbiamo qui),
         // andrebbe risolto a GUID qui, ma per le dropdown è già gestito.
         onUpdate(node.id, tempValues);
         onOpenChange(false);
     }
   };
 
   // Determina i tipi di entità per il campo 'to' basati sul verbo corrente
   const toEntityTypes = node && node.type === 'action' ? getToEntityTypes((tempValues as Partial<ActionNode>).verb || '') : [];
   const defaultFromValue = resolveEntityId('SOMEONE', entities); 
 
   return (
     <Dialog open={open} onOpenChange={(isOpen) => {
         if (!isOpen) {
             // Considera se resettare tempValues o fare altre pulizie quando si chiude senza salvare
         }
         onOpenChange(isOpen);
     }}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>
             Edit {node?.type === 'action' ? 'Action' : 'State'}
           </DialogTitle>
         </DialogHeader>
         <div className="mt-4">
           <div className="mb-4">
             <label className="text-sm font-medium">Label</label>
             <input
               type="text"
               value={tempValues.label || ''}
               onChange={e => handleInputChange('label', e.target.value)}
               className="w-full p-2 mt-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             />
           </div>
 
           {node?.type === 'action' ? (
             <div className="space-y-4">
               <div>
                 <label className="text-sm font-medium">From</label>
                 <EntityDropdown
                   value={(tempValues as Partial<ActionNode>).from || defaultFromValue}
                   onChange={(value) => handleInputChange('from', value)}
                   entityTypes={['Character']}
                   entities={entities}
                   onAddEntity={handleAddEntity}
                   fieldName="from"
                   placeholder="Select Character"
                 />
               </div>
               <div>
                 <label className="text-sm font-medium">Verb</label>
                 <select
                   value={(tempValues as Partial<ActionNode>).verb || ''}
                   onChange={e => handleInputChange('verb', e.target.value)}
                   className="w-full p-2 mt-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                 >
                   <option value="">Select verb</option>
                   {VERBS.map(verb => (
                     <option key={verb} value={verb}>{verb}</option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="text-sm font-medium">To</label>
                 <EntityDropdown
                   value={(tempValues as Partial<ActionNode>).to || ''}
                   onChange={(value) => handleInputChange('to', value)}
                   entityTypes={toEntityTypes}
                   entities={entities}
                   onAddEntity={handleAddEntity}
                   fieldName="to"
                   placeholder={`Select ${toEntityTypes.join('/')}`}
                 />
               </div>
               {(tempValues as Partial<ActionNode>).verb === 'Interact with' && (
                 <div>
                   <label className="text-sm font-medium">With</label>
                   <EntityDropdown
                     value={(tempValues as Partial<ActionNode>).with || ''}
                     onChange={(value) => handleInputChange('with', value)}
                     entityTypes={['Item']}
                     entities={entities}
                     onAddEntity={handleAddEntity}
                     fieldName="with"
                     placeholder="Select Item"
                   />
                 </div>
               )}
               <div>
                 <label className="text-sm font-medium">Where</label>
                 <EntityDropdown
                   value={(tempValues as Partial<ActionNode>).where || ''}
                   onChange={(value) => handleInputChange('where', value)}
                   entityTypes={['Location']}
                   entities={entities}
                   onAddEntity={handleAddEntity}
                   fieldName="where"
                   placeholder="Select Location"
                 />
               </div>
               <div>
                 <label className="text-sm font-medium">Script</label>
                 <textarea
                   value={(tempValues as Partial<ActionNode>).script || ''}
                   onChange={e => handleInputChange('script', e.target.value)}
                   className="w-full p-2 mt-1 border rounded"
                   rows={3}
                   placeholder="Enter script here..."
                 />
               </div>
             </div>
           ) : (
             <div>
               <label className="text-sm font-medium">Description</label>
               <textarea
                 value={(tempValues as Partial<StateNode>).description || ''}
                 onChange={e => handleInputChange('description', e.target.value)}
                 rows={3}
                 className="w-full p-2 mt-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
               />
             </div>
           )}
           {node?.type === 'state' && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Flags</label>
                <button onClick={handleAddFlag} className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs">
                  + Add Flag
                </button>
              </div>
              {(tempValues as Partial<StateNode>).flags?.map((flag, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 border rounded bg-gray-50 dark:bg-gray-900">
                  <input
                    type="text"
                    placeholder="Flag name"
                    value={flag.name}
                    onChange={(e) => handleFlagChange(index, 'name', e.target.value)}
                    className="flex-grow p-1 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  />
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={flag.value}
                      onChange={(e) => handleFlagChange(index, 'value', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {flag.value ? 'True' : 'False'}
                    </label>
                  </div>
                  <button onClick={() => handleRemoveFlag(index)} className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 text-xs">
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
         </div>
 
         <div className="mt-6 flex justify-end space-x-2">
           <button onClick={() => onOpenChange(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600">Cancel</button>
           <button onClick={handleDialogSave} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };