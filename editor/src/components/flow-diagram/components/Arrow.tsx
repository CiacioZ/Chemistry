import React, { useState } from 'react';
import { Position } from '../types';

interface ArrowProps {
  startPos: Position;    // Posizione di partenza della freccia
  endPos: Position;      // Posizione di arrivo della freccia
  onRemove: () => void;  // Funzione chiamata quando la freccia viene rimossa
}

export const Arrow: React.FC<{
  startPos: Position;
  endPos: Position;
  onRemove: () => void;
}> = ({ startPos, endPos, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
    
    // Calcoliamo i punti di inizio e fine della freccia
    const startX = startPos.x + startPos.width;  // Punto di partenza (invariato)
    const startY = startPos.y + startPos.height / 2;
    
    // Aggiungiamo un offset per il punto di arrivo
    // L'offset di 12px corrisponde al raggio del punto di connessione (4px) 
    // più un piccolo spazio extra per evitare sovrapposizioni
    const connectionPointOffset = -10;
    const endX = endPos.x + connectionPointOffset;  // Spostiamo il punto finale più a destra
    const endY = endPos.y + endPos.height / 2;
    
    // Calcoliamo il punto di controllo per la curva di Bezier
    const controlX = (startX + endX) / 2;
    const controlY = startY;
    
    // Calcoliamo l'angolo per la punta della freccia
    const dx = endX - controlX;
    const dy = endY - controlY;
    const angle = Math.atan2(dy, dx);
    
    // Calcoliamo i punti per la punta della freccia
    const arrowLength = 10;
    const point1X = endX - arrowLength * Math.cos(angle - Math.PI/6);
    const point1Y = endY - arrowLength * Math.sin(angle - Math.PI/6);
    const point2X = endX - arrowLength * Math.cos(angle + Math.PI/6);
    const point2Y = endY - arrowLength * Math.sin(angle + Math.PI/6);
  
    return (
      <g
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onRemove} 
        style={{ cursor: 'pointer' }}
      >
        {/* Area interattiva più ampia per facilitare il click */}
        <path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`}
          stroke="transparent"
          strokeWidth="20"
          fill="none"
        />
        {/* Linea della freccia */}
        <path
          d={`M ${startX} ${startY} Q ${controlX} ${controlY}, ${endX} ${endY}`}
          stroke={isHovered ? "#ff4444" : "#666"}
          strokeWidth={isHovered ? "3" : "2"}
          fill="none"
        />
        {/* Punta della freccia */}
        <path
          d={`M ${endX} ${endY} L ${point1X} ${point1Y} L ${point2X} ${point2Y} Z`}
          fill={isHovered ? "#ff4444" : "#666"}
        />
      </g>
    );
  };