"use client"

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react'; // AGGIUNTO Dispatch, SetStateAction
import { Node, Entity, PREDEFINED_ENTITIES } from '../types/index';
import { useHistory } from '../hooks/useHistory';

interface DiagramContextType {
  nodes: Node[];
  pushNodes: (nodes: Node[]) => void;
  entities: Entity[];
  setEntities: Dispatch<SetStateAction<Entity[]>>; // MODIFICATO
  projectName: string;
  setProjectName: (name: string) => void;
  undoNodes: () => void;
  redoNodes: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DiagramContext = createContext<DiagramContextType | null>(null);

export const useDiagramContext = () => {
  const context = useContext(DiagramContext);
  if (context === null) {
    throw new Error('useDiagramContext must be used within a DiagramProvider');
  }
  return context;
};

interface DiagramProviderProps {
  children: ReactNode;
}

export const DiagramProvider: React.FC<DiagramProviderProps> = ({ children }) => {
  const [projectName, setProjectName] = useState<string>('Nuovo Progetto');
  const [entities, setEntities] = useState<Entity[]>(PREDEFINED_ENTITIES);
  
  const {
    state: nodes,
    pushState: pushNodes,
    undo: undoNodes,
    redo: redoNodes,
    canUndo,
    canRedo
  } = useHistory<Node[]>([]);

  return (
    <DiagramContext.Provider value={{
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
    }}>
      {children}
    </DiagramContext.Provider>
  );
};