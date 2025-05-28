'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, ScriptEntity, ScriptDetails } from '../flow-diagram/types/index';
import { v4 as uuidv4 } from 'uuid';

interface ScriptData {
  id: string;
  name: string;
  scriptContent?: string;
}

export const ScriptEditor: React.FC = () => {
  const { entities, setEntities } = useDiagramContext();

  const scriptEntities = useMemo(() => {
    return entities.filter((entity): entity is ScriptEntity => entity.type === 'Script' && !entity.internal);
  }, [entities]);

  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ScriptData>>({});
  
  const isInitialDataLoad = React.useRef(false);

  useEffect(() => {
    if (selectedScriptId) {
      const selectedEntity = scriptEntities.find(script => script.id === selectedScriptId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          scriptContent: selectedEntity.details?.scriptContent || '',
        });
      } else {
        setSelectedScriptId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedScriptId, scriptEntities]);

  useEffect(() => {
    if (isInitialDataLoad.current) {
      isInitialDataLoad.current = false;
      return;
    }

    if (!selectedScriptId || !formData.id) {
      return;
    }

    const scriptIdToUpdate = selectedScriptId;

    const newName = formData.name;
    if (newName) {
      const isNameTaken = entities.some(e => e.type === 'Script' && e.name === newName && e.id !== scriptIdToUpdate);
      if (isNameTaken) {
        alert(`Il nome dello script "${newName}" è già in uso. Modifica del nome annullata.`);
        const originalScript = entities.find(e => e.id === scriptIdToUpdate);
        setFormData(prev => ({ ...prev, name: originalScript?.name || '' }));
        return;
      }
    }

    const newEntitiesValue: Entity[] = entities.map((entity: Entity) => {
      if (entity.id === scriptIdToUpdate && entity.type === 'Script') {
        const currentEntity = entity as ScriptEntity;
        const newDetails: ScriptDetails = {
          scriptContent: formData.scriptContent || '',
        };
        return {
          ...currentEntity,
          name: formData.name || currentEntity.name,
          details: newDetails,
        };
      }
      return entity;
    });

    // Only update if there are actual changes to avoid infinite loops with useEffect
    if (JSON.stringify(entities) !== JSON.stringify(newEntitiesValue)) {
        setEntities(newEntitiesValue);
    }
  }, [formData, selectedScriptId, setEntities, entities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSelectScript = (id: string) => {
    setSelectedScriptId(id);
  };

  const handleCreateScript = () => {
    const newGuid = uuidv4();
    const baseNewName = "NewScript";
    let newName = baseNewName;
    let counter = 1;
    while (entities.some(e => e.name === newName && e.type === 'Script')) {
      newName = `${baseNewName}_${counter}`;
      counter++;
    }

    const newScript: ScriptEntity = {
      id: newGuid,
      type: 'Script',
      name: newName,
      internal: false,
      details: {
        scriptContent: '// Start writing your script here\n',
      }
    };
    setEntities(prevEntities => [...prevEntities, newScript]);
    setSelectedScriptId(newGuid);
  };

  const handleDeleteScript = useCallback((scriptIdToDelete: string) => {
    if (window.confirm('Sei sicuro di voler cancellare lo script? Questa azione non può essere annullata.')) {
      const newEntities = entities.filter((entity: Entity) => entity.id !== scriptIdToDelete);
      setEntities(newEntities);

      if (selectedScriptId === scriptIdToDelete) {
        setSelectedScriptId(null);
        setFormData({});
      }
    }
  }, [selectedScriptId, setEntities, entities]);

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista degli Script */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Scripts</h3>
          <button
            onClick={handleCreateScript}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            + New Script
          </button>
        </div>
        <ul>
          {scriptEntities.map((script) => (
            <li
              key={script.id}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedScriptId === script.id ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectScript(script.id)} className="flex-grow">
                {script.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteScript(script.id);
                }}
                className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 focus:outline-none"
                aria-label={`Delete ${script.name}`}
                title={`Delete ${script.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Script */}
      <div className="w-2/3 flex flex-col space-y-4 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Script Details</h2>
        {selectedScriptId && formData.id ? (
          <form className="space-y-4 h-full flex flex-col" onSubmit={(e) => e.preventDefault()}>
            {/* ID (GUID) - Read-only */}
            <div>
              <label htmlFor="scriptId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Script ID (GUID - Read-only)
              </label>
              <input
                type="text"
                id="scriptId"
                name="id"
                value={formData.id || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
              />
            </div>
            {/* Name */}
            <div>
              <label htmlFor="scriptName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="scriptName"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Script Content Textarea */}
            <div className="flex-grow flex flex-col">
              <label htmlFor="scriptContent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Script Content
              </label>
              <textarea
                id="scriptContent"
                name="scriptContent"
                value={formData.scriptContent || ''}
                onChange={handleChange}
                className="w-full flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm"
                placeholder="Enter your script here..."
                spellCheck="false"
              />
            </div>
            
            {/* Delete Button */}
            <div className="flex justify-end mt-auto pt-4">
              <button
                type="button"
                onClick={() => handleDeleteScript(selectedScriptId!)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={!selectedScriptId}
              >
                Delete Script
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a script from the list to view or edit its details, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}; 