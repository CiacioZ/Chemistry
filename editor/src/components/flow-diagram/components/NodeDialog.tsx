import React, { useState, useEffect } from 'react';
import { Node, Entity, EntityType, VERBS } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
 } from "@/components/ui/dialog";
 
 const getToEntityTypes = (verb: string): EntityType[] => {
   switch(verb) {
     case 'Talk to': return ['Character'];
     case 'Get': return ['Item'];
     case 'Go to': return ['Location'];
     case 'Interact with': return ['Character', 'Item'];
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
   // Filtra le entità per i tipi richiesti e le raggruppa per tipo
   const groupedEntities = entityTypes.reduce((acc, type) => {
     const typeEntities = entities.filter(e => e.type === type);
     if (typeEntities.length > 0) {
       acc[type] = typeEntities;
     }
     return acc;
   }, {} as Record<EntityType, Entity[]>);
   
   const handleAddClick = () => {
     if (entityTypes.length === 0) return;
     
     // Se siamo nel campo "to" e ci sono sia Character che Item
     if (fieldName === 'to' && entityTypes.length > 1 && value) {
       const selectedEntity = entities.find(e => e.name === value);
       if (selectedEntity) {
         onAddEntity(fieldName, selectedEntity.type);
         return;
       }
     }
     
     // Altrimenti usiamo il primo tipo disponibile
     onAddEntity(fieldName, entityTypes[0]);
   };
 
   return (
     <div className="flex gap-2">
       <select
         value={value}
         onChange={(e) => onChange(e.target.value)}
         className="w-full p-2 border rounded bg-white"
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
               <option key={entity.name} value={entity.name}>
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
 
 export const NodeDialog: React.FC<{
   node: Node | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onUpdate: (id: string, updates: Partial<Node>) => void;
   entities: Entity[];
   setEntities: (entities: Entity[]) => void;
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
       setTempValues(node.type === 'action' ? {
         ...node,
         from: node.from || 'MAIN_CHARACTER' // Default value for 'from'
       } : node);
     }
   }, [open, node]);
 
   const handleAddEntity = (fieldName: string, type: EntityType) => {
     if (!type) return; // Guard clause per sicurezza
     
     const name = prompt(`Enter new ${type.toLowerCase()} name:`);
     if (name) {
       setEntities([...entities, { type, name: name, internal: false }]);
       // Selezioniamo automaticamente la nuova entità
       handleInputChange(fieldName, name);
     }
   };
 
   const handleInputChange = (field: string, value: string) => {
     setTempValues(prev => ({
       ...prev,
       [field]: value
     }));
   };
 
   if (!node) return null;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent>
         <DialogHeader>
           <DialogTitle>
             Edit {node.type === 'action' ? 'Action' : 'State'}
           </DialogTitle>
         </DialogHeader>
         <div className="mt-4">
           <div className="mb-4">
             <label className="text-sm font-medium">Label</label>
             <input
               type="text"
               value={tempValues.label || ''}
               onChange={e => handleInputChange('label', e.target.value)}
               className="w-full p-2 mt-1 border rounded"
             />
           </div>
 
           {node.type === 'action' ? (
             <div className="space-y-4">
               <div>
                 <label className="text-sm font-medium">From</label>
                 <EntityDropdown
                   value={tempValues.from || 'MAIN_CHARACTER'}
                   onChange={(value) => handleInputChange('from', value)}
                   entityTypes={['Character']}
                   entities={entities}
                   onAddEntity={handleAddEntity}
                   fieldName="from"
                 />
               </div>
               <div>
                 <label className="text-sm font-medium">Verb</label>
                 <select
                   value={tempValues.verb || ''}
                   onChange={e => {
                     handleInputChange('verb', e.target.value);
                     // Reset with quando il verbo non è più "Interact with"
                     if (e.target.value !== 'Interact with') {
                       handleInputChange('with', '');
                     }
                   }}
                   className="w-full p-2 mt-1 border rounded bg-white"
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
                   value={tempValues.to || ''}
                   onChange={(value) => handleInputChange('to', value)}
                   entityTypes={getToEntityTypes(tempValues.verb || '')}
                   entities={entities}
                   onAddEntity={handleAddEntity}
                   fieldName="to"
                 />
               </div>
               {tempValues.verb === 'Interact with' && (
                 <div>
                   <label className="text-sm font-medium">With</label>
                   <EntityDropdown
                     value={tempValues.with || ''}
                     onChange={(value) => handleInputChange('with', value)}
                     entityTypes={['Item']}
                     entities={entities}
                     onAddEntity={handleAddEntity}
                     fieldName="with"
                   />
                 </div>
               )}
               <div>
                 <label className="text-sm font-medium">Where</label>
                 <EntityDropdown
                   value={tempValues.where || ''}
                   onChange={(value) => handleInputChange('where', value)}
                   entityTypes={['Location']}
                   entities={entities}
                   onAddEntity={handleAddEntity}
                   fieldName="where"
                 />
               </div>
             </div>
           ) : (
             <div>
               <label className="text-sm font-medium">Description</label>
               <input
                 type="text"
                 value={tempValues.description || ''}
                 onChange={e => handleInputChange('description', e.target.value)}
                 className="w-full p-2 mt-1 border rounded"
               />
             </div>
           )}
         </div>
 
         <div className="mt-6 flex justify-end gap-3">
           <button
             onClick={() => onOpenChange(false)}
             className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
           >
             Cancel
           </button>
           <button
             onClick={() => {
               if (node) {
                 onUpdate(node.id, tempValues);
                 onOpenChange(false);
               }
             }}
             className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
           >
             OK
           </button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };