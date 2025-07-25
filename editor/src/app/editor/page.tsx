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
import { ScriptEditor } from '@/components/entity-editor/ScriptEditor';
import { FontEditor } from '@/components/entity-editor/FontEditor';
import { PREDEFINED_ENTITIES } from '@/components/flow-diagram/types/index'; // Questo import dovrebbe essere già presente
import { CursorEditor } from '@/components/entity-editor/CursorEditor';

const editorTabs: EditorTabType[] = ['Graph', 'Locations', 'Items', 'Characters', 'Scripts', 'Fonts', 'Cursors'];

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
    // Salva lo stato corrente: nodi del grafo, nome progetto,
    // e l'array delle entità (che ora include i dettagli aggiornati
    // dagli editor attivi, come i poligoni delle location).
    // Assicurati che la funzione 'saveDiagram' sia in grado di gestire
    // correttamente la serializzazione dei dettagli delle entità.
    saveDiagram(nodes, projectName, entities);
    alert('Progetto salvato!'); // Feedback opzionale per l'utente
  };

  // Funzione per caricare
  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    loadDiagram(
      file,
      (loadedNodes, loadedProjectName, loadedEntities) => {
        // Assicurati che 'loadDiagram' carichi correttamente anche
        // i dettagli delle entità nell'array 'loadedEntities'.
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
    setEntities(PREDEFINED_ENTITIES); // MODIFICATO: Resetta alle entità predefinite invece di un array vuoto
    setCurrentTab('Graph'); // Assicurati che la tab del diagramma sia attiva
    // Potresti anche voler navigare via e tornare, ma resettare lo stato è più semplice
    // router.push('/'); // Opzionale: torna alla home page
  };


  // Fornire un imageUploadService fittizio o reale se disponibile
  const dummyImageUploadService = async (file: File): Promise<string> => {
    console.log("Dummy imageUploadService called from EditorPage with:", file.name);
    return new Promise(resolve => {
      setTimeout(() => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      }, 1000);
    });
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
        return <LocationEditor imageUploadService={dummyImageUploadService} setEntities={setEntities}/>;
      case 'Items':
        return <ItemEditor imageUploadService={dummyImageUploadService} />; // <-- QUI VIENE PASSATO IL SERVIZIO
      case 'Characters':
        return <CharacterEditor />;
      case 'Scripts':
        return <ScriptEditor />;
      case 'Fonts':
        return <FontEditor fileUploadService={dummyImageUploadService} />;
      case 'Cursors':
        return <CursorEditor />;
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