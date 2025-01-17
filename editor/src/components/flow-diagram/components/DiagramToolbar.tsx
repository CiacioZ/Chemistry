import React from 'react';
import { PlusCircle, Save, Upload } from 'lucide-react';
import { useDiagramContext } from '../contexts/DiagramContext';
import { saveDiagram, loadDiagram } from '../utils/saveLoad';
import { diagramOperations } from '../services/diagramOperations';

interface DiagramToolbarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export const DiagramToolbar: React.FC<DiagramToolbarProps> = ({ scrollContainerRef }) => {
  const {
    nodes,
    pushNodes,
    entities,
    setEntities,
    projectName,
    setProjectName,
    undoNodes,
    redoNodes,
    canUndo,
    canRedo
  } = useDiagramContext();

  const handleSave = () => {
    saveDiagram(nodes, projectName, entities);
  };

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
  
    loadDiagram(
      file,
      (loadedNodes, loadedProjectName, loadedEntities) => {
        pushNodes(loadedNodes);
        setProjectName(loadedProjectName);
        setEntities(loadedEntities);
      },
      (error) => {
        alert('Errore nel caricamento del file: ' + error);
      }
    );
  };

  const createNode = (type: 'action' | 'state') => {
    const container = scrollContainerRef.current;
    const newNode = diagramOperations.createNode(
      type, 
      { left: 100, top: 100 }, 
      container, 
      nodes
    );
    pushNodes([...nodes, newNode]);
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={() => createNode('action')}
        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <PlusCircle size={16} />
        Nuovo Action
      </button>
      
      <button
        onClick={() => createNode('state')}
        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
      >
        <PlusCircle size={16} />
        Nuovo State
      </button>

      <div className="h-6 w-px bg-gray-300 mx-2" />

      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="px-4 py-2 border rounded w-64 mr-4"
        placeholder="Nome Progetto"
      />

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700"
      >
        <Save size={16} />
        Salva
      </button>
      
      <label className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 cursor-pointer">
        <Upload size={16} />
        Carica
        <input
          type="file"
          accept=".json"
          onChange={handleLoad}
          className="hidden"
        />
      </label>

      <button
        onClick={undoNodes}
        disabled={!canUndo}
        className={`px-4 py-2 rounded ${
          canUndo 
            ? 'bg-gray-600 text-white hover:bg-gray-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title="Annulla (Ctrl+Z)"
      >
        Annulla
      </button>
      
      <button
        onClick={redoNodes}
        disabled={!canRedo}
        className={`px-4 py-2 rounded ${
          canRedo 
            ? 'bg-gray-600 text-white hover:bg-gray-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        title="Ripeti (Ctrl+Shift+Z)"
      >
        Ripeti
      </button>
    </div>
  );
};