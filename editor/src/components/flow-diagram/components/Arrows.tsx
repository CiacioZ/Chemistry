import React from 'react';
import { Arrow } from './Arrow';
import { Node, NodePositions } from '../types/index';
import { diagramOperations } from '../services/diagramOperations';

interface ArrowsProps {
  nodes: Node[];
  positions: NodePositions;
  pushNodes: (newNodes: Node[]) => void; 
}

export const Arrows: React.FC<ArrowsProps> = ({ nodes, positions, pushNodes }) => {
  
  const handleRemoveConnection = (sourceId: string, targetId: string) => {
    const newNodes = diagramOperations.removeConnection(nodes, sourceId, targetId);
    pushNodes(newNodes);
  };
  
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <g className="pointer-events-auto">
        {nodes.flatMap(node => {
          if (!Array.isArray(node.connections.out) || !positions[node.id]) {
            return [];
          }

          return node.connections.out.map(targetId => {
            if (!positions[targetId]) {
              return null;
            }
            return (
              <Arrow
                key={`${node.id}-${targetId}`}
                startPos={positions[node.id]}
                endPos={positions[targetId]}
                onRemove={() => handleRemoveConnection(node.id, targetId)}
              />
            );
          }).filter(arrow => arrow !== null);
        })}
      </g>
    </svg>
  );
};