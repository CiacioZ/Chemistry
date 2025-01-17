import React from 'react';

interface ConnectionPointProps {
  nodeId: string;
  onStartConnection: (
    nodeId: string,
    position: { x: number; y: number }
  ) => void;
  onEndConnection: (targetId: string) => void;
  isConnecting: boolean;
  position: 'right' | 'left';
  canConnect: boolean; // true se il punto può partecipare alla connessione corrente
}

export const ConnectionPoint: React.FC<ConnectionPointProps> = ({
  nodeId,
  onStartConnection,
  onEndConnection,
  isConnecting,
  position,
  canConnect
}) => {
  const isInput = position === 'left';
  
  const handleMouseDown = (e: React.MouseEvent) => {
    // Solo i punti di output possono iniziare una connessione
    if (!isInput) {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      onStartConnection(nodeId, {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Solo i punti di input possono ricevere una connessione
    if (isInput && canConnect) {
      onEndConnection(nodeId);
    }
  };

  // Calcoliamo lo stile del punto in base al suo stato
  const getPointStyle = () => {
    if (!isConnecting) {
      return 'border-gray-400 bg-white hover:border-blue-500 hover:bg-blue-100';
    }
    
    if (canConnect) {
      return 'border-green-500 bg-green-200 hover:bg-green-300';
    }
    
    return 'border-red-500 bg-red-200 cursor-not-allowed';
  };

  return (
    <div
      className={`
        absolute top-1/2 w-4 h-4 rounded-full border-2 z-10
        ${position === 'right' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'}
        -translate-y-1/2 cursor-crosshair
        shadow-sm select-none
        ${getPointStyle()}
      `}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      title={isInput ? 'Input Connection Point' : 'Output Connection Point'}
    />
  );
};