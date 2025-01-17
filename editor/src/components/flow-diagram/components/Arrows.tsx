import React from 'react';
import { Arrow } from './Arrow';
import { Node, NodePositions } from '../types';

interface ArrowsProps {
  nodes: Node[];
  positions: NodePositions;
  pushNodes: (newNodes: Node[]) => void; 
}

export const Arrows: React.FC<ArrowsProps> = ({ nodes, positions, pushNodes }) => {
  
  const removeConnection = (sourceId: string, targetId: string) => {
    const newNodes = nodes.map(node => {
      if (node.id === sourceId) {
        // Rimuoviamo la connessione in uscita dal nodo sorgente
        return {
          ...node,
          connections: {
            ...node.connections,
            out: null
          }
        };
      }
      if (node.id === targetId) {
        // Rimuoviamo la connessione in entrata dal nodo target
        return {
          ...node,
          connections: {
            ...node.connections,
            in: node.connections.in.filter(id => id !== sourceId)
          }
        };
      }
      return node;
    });
    
    pushNodes(newNodes);
  };
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <g className="pointer-events-auto">
        {nodes.map(node => {
          if (!node.connections.out || !positions[node.id] || !positions[node.connections.out]) {
            return null;
          }

          return (
            <Arrow
              key={`${node.id}-${node.connections.out}`}
              startPos={positions[node.id]}
              endPos={positions[node.connections.out]}
              onRemove={() => removeConnection(node.id, node.connections.out!)}
            />
          );
        })}
      </g>
    </svg>
  );
};