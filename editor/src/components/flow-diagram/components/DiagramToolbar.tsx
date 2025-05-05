import React from 'react';
import { PlusCircle } from 'lucide-react'; // Rimosso Save, Upload
import { useDiagramContext } from '../contexts/DiagramContext';
import { diagramOperations } from '../services/diagramOperations';

interface DiagramToolbarProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export const DiagramToolbar: React.FC<DiagramToolbarProps> = ({ scrollContainerRef }) => {
  const {
    nodes,
    pushNodes,
    // Rimosso entities
    // Rimosso projectName
    // Rimosso setProjectName
    undoNodes,
    redoNodes,
    canUndo,
    canRedo
  } = useDiagramContext();

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

      {/* Rimosso l'input del nome progetto da qui */}
      {/* <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="px-4 py-2 border rounded w-64 mr-4"
        placeholder="Nome Progetto"
      /> */}

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