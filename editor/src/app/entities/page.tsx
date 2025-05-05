'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importa useRouter
import { Save, Upload, FilePlus } from 'lucide-react'; // Importa le icone necessarie
import EditorTabs, { EditorTabType } from '@/components/entity-editor/EntityTabs';
import FlowDiagram from '@/components/flow-diagram/FlowDiagram';
import { useDiagramContext } from '@/components/flow-diagram/contexts/DiagramContext'; // Importa il context
import { saveDiagram, loadDiagram } from '@/components/flow-diagram/utils/saveLoad'; // Importa save/load

import { LocationEditor } from '@/components/entity-editor/LocationEditor';
import { ItemEditor } from '@/components/entity-editor/ItemEditor';
import { CharacterEditor } from '@/components/entity-editor/CharacterEditor';

const editorTabs: EditorTabType[] = ['Graph', 'Locations', 'Items', 'Characters'];

export default function EditorPage() {
  const [currentTab, setCurrentTab] = useState<EditorTabType>('Graph');
  const router = useRouter(); // Hook per la navigazione
  const {
    nodes,
    projectName, // Assicurati che sia già qui
    entities,
    pushNodes,
    setProjectName, // Assicurati che sia già qui
    setEntities,
    // resetDiagramState // Commentato se non implementato
  } = useDiagramContext();

  // Funzione per salvare
  const handleSave = () => {
    saveDiagram(nodes, projectName, entities);
  };

  // Funzione per caricare
  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    loadDiagram(
      file,
      (loadedNodes, loadedProjectName, loadedEntities) => {
        pushNodes(loadedNodes); // Usa pushNodes per compatibilità undo/redo
        setProjectName(loadedProjectName);
        setEntities(loadedEntities);
        setCurrentTab('Graph'); // Torna alla tab del diagramma dopo il caricamento
      },
      (error) => {
        alert('Errore nel caricamento del file: ' + error);
      }
    );
    event.target.value = ''; // Resetta l'input
  };

  // Funzione per nuovo progetto
  const handleNewProject = () => {
    // Resetta lo stato del diagramma (nodi, nome, entità)
    // Se resetDiagramState non esiste nel context, implementalo lì
    // Altrimenti, chiama le singole funzioni:
    pushNodes([]);
    setProjectName('Nuovo Progetto');
    setEntities([]);
    setCurrentTab('Graph'); // Assicurati che la tab del diagramma sia attiva
    // Potresti anche voler navigare via e tornare, ma resettare lo stato è più semplice
    // router.push('/'); // Opzionale: torna alla home page
  };


  const renderEditorContent = () => {
    switch (currentTab) {
      case 'Graph':
        return (
          <div className="w-full h-[calc(100vh-150px)]">
             <FlowDiagram />
          </div>
        );
      case 'Locations':
        return <LocationEditor />;
      case 'Items':
        return <ItemEditor />;
      case 'Characters':
        return <CharacterEditor />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Chemistry Editor</h1>
      {/* Contenitore per Tabs e Controlli Progetto */}
      <div className="flex justify-between items-center border-b border-gray-300 mb-4 pb-2"> {/* Aggiunto pb-2 per spaziatura */}
         <EditorTabs
           tabs={editorTabs}
           onTabChange={setCurrentTab}
           initialTab={currentTab}
         />
         {/* Controlli Progetto: Input Nome, Nuovo, Salva, Carica */}
         <div className="flex items-center gap-2">
            {/* Input Nome Progetto */}
            Nome del progetto
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="px-3 py-1 border rounded text-sm w-48" // Stile simile ai bottoni
              placeholder="Nome Progetto"
              title="Nome del progetto corrente"
            />
            {/* Separatore opzionale */}
            <div className="h-5 w-px bg-gray-300 mx-1" />

            {/* Bottoni Nuovo, Salva, Carica */}
            <button
              onClick={handleNewProject}
              className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              title="Crea un nuovo progetto vuoto"
            >
              <FilePlus size={14} />
              Nuovo
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm"
              title="Salva progetto corrente"
            >
              <Save size={14} />
              Salva
            </button>
            <label className="flex items-center gap-1 px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 cursor-pointer text-sm" title="Carica progetto da file">
              <Upload size={14} />
              Carica
              <input
                type="file"
                accept=".json"
                onChange={handleLoad}
                className="hidden"
              />
            </label>
         </div>
      </div>
      <div className="flex-grow overflow-auto">
        {renderEditorContent()}
      </div>
    </div>
  );
}