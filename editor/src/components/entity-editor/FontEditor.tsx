'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDiagramContext } from '../flow-diagram/contexts/DiagramContext';
import { Entity, FontEntity, FontDetails } from '../flow-diagram/types/index';
import { v4 as uuidv4 } from 'uuid';

interface FontData {
  id: string;
  name: string;
  fontFileUrl?: string;
}

interface FontEditorProps {
  fileUploadService?: (file: File, entityId: string, fieldName: string) => Promise<string>; // Assuming a service that can handle general files
}

export const FontEditor: React.FC<FontEditorProps> = ({ fileUploadService }) => {
  const { entities, setEntities } = useDiagramContext();

  const fontEntities = useMemo(() => {
    return entities.filter((entity): entity is FontEntity => entity.type === 'Font' && !entity.internal);
  }, [entities]);

  const [selectedFontId, setSelectedFontId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<FontData>>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialDataLoad = useRef(false);

  useEffect(() => {
    if (selectedFontId) {
      const selectedEntity = fontEntities.find(font => font.id === selectedFontId);
      if (selectedEntity) {
        isInitialDataLoad.current = true;
        setFormData({
          id: selectedEntity.id,
          name: selectedEntity.name,
          fontFileUrl: selectedEntity.details?.fontFileUrl || '',
        });
      } else {
        setSelectedFontId(null);
        setFormData({});
      }
    } else {
      setFormData({});
    }
  }, [selectedFontId, fontEntities]);

  useEffect(() => {
    if (isInitialDataLoad.current) {
      isInitialDataLoad.current = false;
      return;
    }

    if (!selectedFontId || !formData.id) {
      return;
    }

    const fontIdToUpdate = selectedFontId;

    const newName = formData.name;
    if (newName) {
      const isNameTaken = entities.some(e => e.type === 'Font' && e.name === newName && e.id !== fontIdToUpdate);
      if (isNameTaken) {
        alert(`Il nome del font "${newName}" è già in uso. Modifica del nome annullata.`);
        const originalFont = entities.find(e => e.id === fontIdToUpdate);
        setFormData(prev => ({ ...prev, name: originalFont?.name || '' }));
        return;
      }
    }

    const newEntitiesValue: Entity[] = entities.map((entity: Entity) => {
      if (entity.id === fontIdToUpdate && entity.type === 'Font') {
        const currentEntity = entity as FontEntity;
        const newDetails: FontDetails = {
          ...(currentEntity.details || {}),
          fontFileUrl: formData.fontFileUrl || '',
        };
        return {
          ...currentEntity,
          name: formData.name || currentEntity.name,
          details: newDetails,
        };
      }
      return entity;
    });

    if (JSON.stringify(entities) !== JSON.stringify(newEntitiesValue)) {
      setEntities(newEntitiesValue);
    }
  }, [formData, selectedFontId, setEntities, entities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSelectFont = (id: string) => {
    setSelectedFontId(id);
  };

  const handleCreateFont = () => {
    const newGuid = uuidv4();
    const baseNewName = "NewFont";
    let newName = baseNewName;
    let counter = 1;
    while (entities.some(e => e.name === newName && e.type === 'Font')) {
      newName = `${baseNewName}_${counter}`;
      counter++;
    }

    const newFont: FontEntity = {
      id: newGuid,
      type: 'Font',
      name: newName,
      internal: false,
      details: {
        fontFileUrl: '',
      }
    };
    setEntities(prevEntities => [...prevEntities, newFont]);
    setSelectedFontId(newGuid);
  };

  const handleDeleteFont = useCallback((fontIdToDelete: string) => {
    if (window.confirm('Sei sicuro di voler cancellare il font? Questa azione non può essere annullata.')) {
      const newEntities = entities.filter((entity: Entity) => entity.id !== fontIdToDelete);
      setEntities(newEntities);

      if (selectedFontId === fontIdToDelete) {
        setSelectedFontId(null);
        setFormData({});
      }
    }
  }, [selectedFontId, setEntities, entities]);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFontId) {
      return;
    }

    if (!fileUploadService) {
      console.warn("fileUploadService is not provided to FontEditor.");
      alert("Servizio di caricamento file non configurato.");
      return;
    }

    setIsUploading(true);
    try {
      // Assuming fileUploadService can take entityId and a field name (e.g., 'fontFile')
      const uploadedUrl = await fileUploadService(file, selectedFontId, 'fontFile'); 
      setFormData(prevData => ({
        ...prevData,
        fontFileUrl: uploadedUrl,
      }));
    } catch (error) {
      console.error("Error uploading font file:", error);
      alert("Errore durante il caricamento del file del font.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex h-full space-x-4">
      {/* Colonna Sinistra: Lista dei Font */}
      <div className="w-1/3 border rounded-md shadow-sm p-4 overflow-y-auto bg-gray-50 dark:bg-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Fonts</h3>
          <button
            onClick={handleCreateFont}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
          >
            + New Font
          </button>
        </div>
        <ul>
          {fontEntities.map((font) => (
            <li
              key={font.id}
              className={`flex justify-between items-center p-2 mb-1 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${
                selectedFontId === font.id ? 'bg-blue-100 dark:bg-blue-800 font-semibold' : ''
              }`}
            >
              <span onClick={() => handleSelectFont(font.id)} className="flex-grow">
                {font.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFont(font.id);
                }}
                className="ml-2 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 focus:outline-none"
                aria-label={`Delete ${font.name}`}
                title={`Delete ${font.name}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Colonna Destra: Form di Editing Font */}
      <div className="w-2/3 flex flex-col space-y-4 border rounded-md shadow-sm p-4 bg-white dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Font Details</h2>
        {selectedFontId && formData.id ? (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {/* ID (GUID) - Read-only */}
            <div>
              <label htmlFor="fontId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Font ID (GUID - Read-only)
              </label>
              <input
                type="text"
                id="fontId"
                name="id"
                value={formData.id || ''}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300"
              />
            </div>
            {/* Name */}
            <div>
              <label htmlFor="fontName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                id="fontName"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Font File Upload */}
            <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700/50 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Font File (.ttf, .otf, .woff, etc.)
                </label>
                <button
                  type="button"
                  onClick={handleFileUploadClick}
                  disabled={isUploading || !fileUploadService}
                  className={`px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white 
                              ${isUploading || !fileUploadService ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
                              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  {isUploading ? 'Uploading...' : (formData.fontFileUrl ? 'Change File' : 'Upload File')}
                </button>
              </div>
              <div className="mt-1 p-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-md text-center">
                {formData.fontFileUrl ? (
                  <div className="text-sm text-green-600 dark:text-green-400">
                    <p>File caricato: <a href={formData.fontFileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-800 dark:hover:text-green-200">{formData.fontFileUrl.split('/').pop()}</a></p>
                    {/* TODO: Potremmo voler aggiungere un modo per visualizzare il font, ma è complesso */}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isUploading ? 'Caricamento in corso...' : 'Nessun file font caricato.'}
                  </p>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".ttf,.otf,.woff,.woff2" // Specificare tipi di file per i font
                className="hidden"
              />
              {!fileUploadService && (
                <p className="text-xs text-red-500 mt-1 text-center">Servizio di caricamento file non disponibile.</p>
              )}
            </div>
            
            {/* Delete Button */}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => handleDeleteFont(selectedFontId!)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={!selectedFontId}
              >
                Delete Font
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-10">
            Select a font from the list to view or edit its details, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}; 