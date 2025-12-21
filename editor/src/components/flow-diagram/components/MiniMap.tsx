// src/components/flow-diagram/components/Minimap.tsx

import React from 'react';
import { Node } from '../types/index';

interface MinimapProps {
  nodes: Node[];
  viewportBounds: {
    scrollLeft: number;
    scrollTop: number;
    width: number;
    height: number;
  };
  containerWidth: number;
  containerHeight: number;
  onViewportChange: (scrollLeft: number, scrollTop: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  viewportBounds,
  containerWidth,
  containerHeight,
  onViewportChange
}) => {
  // Definiamo dimensioni fisse per la minimap
  const MINIMAP_WIDTH = 200;  // Larghezza in pixel della minimap
  const MINIMAP_HEIGHT = (MINIMAP_WIDTH * containerHeight) / containerWidth;
  
  // Calcoliamo i fattori di scala per convertire le coordinate
  // dall'area di lavoro alla minimap
  const scaleX = MINIMAP_WIDTH / containerWidth;
  const scaleY = MINIMAP_HEIGHT / containerHeight;

  // Calcoliamo le dimensioni e la posizione del rettangolo che rappresenta
  // la viewport corrente nella minimap
  const viewportRect = {
    x: viewportBounds.scrollLeft * scaleX,
    y: viewportBounds.scrollTop * scaleY,
    width: viewportBounds.width * scaleX,
    height: viewportBounds.height * scaleY
  };

  // Gestiamo il click sulla minimap per navigare nell'area di lavoro
  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convertiamo le coordinate del click nella minimap in coordinate
    // dell'area di lavoro
    const scrollLeft = (x / scaleX) - (viewportBounds.width / 2);
    const scrollTop = (y / scaleY) - (viewportBounds.height / 2);
    
    onViewportChange(scrollLeft, scrollTop);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-2">
      <svg 
        width={MINIMAP_WIDTH} 
        height={MINIMAP_HEIGHT}
        className="border rounded"
        onClick={handleMinimapClick}
      >
        {/* Sfondo della minimap */}
        <rect 
          width="100%" 
          height="100%" 
          fill="#f8f9fa" 
          className="rounded"
        />
        
        {/* Visualizziamo tutti i nodi come piccoli rettangoli */}
        {nodes.map(node => (
          <rect
            key={node.id}
            x={node.position.left * scaleX}
            y={node.position.top * scaleY}
            width={10}
            height={10}
            rx={2}  // Aggiungiamo bordi arrotondati ai rettangoli
            fill={node.type === 'action' ? '#93c5fd' : '#86efac'}
          />
        ))}

        {/* Rettangolo che mostra l'area visibile corrente */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={viewportRect.width}
          height={viewportRect.height}
          fill="rgba(0,0,0,0.1)"
          stroke="#666"
          strokeWidth="1"
          rx={2}
        />
      </svg>
    </div>
  );
};