import { useState, useEffect, RefObject } from 'react';
import { Node, NodePositions } from '../types/index';

export const useNodePositions = (
  nodes: Node[],
  containerRef: RefObject<HTMLDivElement | null>,
  tempNodes: Node[], // Aggiungiamo tempNodes come parametro
  isDragging: boolean // Aggiungiamo lo stato del drag
) => {
  const [nodePositions, setNodePositions] = useState<NodePositions>({});

  // Usiamo tempNodes o nodes in base allo stato del drag
  const currentNodes = isDragging ? tempNodes : nodes;

  useEffect(() => {
    const updatePositions = () => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newPositions: NodePositions = {};
      
      currentNodes.forEach(node => {
        const element = document.getElementById(node.id);
        if (element && containerRef.current) {
          const rect = element.getBoundingClientRect();
          
          newPositions[node.id] = {
            x: rect.left - containerRect.left + containerRef.current.scrollLeft,
            y: rect.top - containerRect.top + containerRef.current.scrollTop,
            width: rect.width,
            height: rect.height
          };
        }
      });
      
      setNodePositions(newPositions);
    };

    // Aggiorniamo le posizioni immediatamente
    updatePositions();

    // Se stiamo facendo drag, aggiungiamo un listener per il movimento
    if (isDragging) {
      const handleMove = () => {
        requestAnimationFrame(updatePositions);
      };
      window.addEventListener('mousemove', handleMove);
      return () => window.removeEventListener('mousemove', handleMove);
    }

    // Altrimenti manteniamo i listener standard
    window.addEventListener('resize', updatePositions);
    if (containerRef.current) {
      containerRef.current.addEventListener('scroll', updatePositions);
    }

    return () => {
      window.removeEventListener('resize', updatePositions);
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', updatePositions);
      }
    };
  }, [currentNodes, containerRef, isDragging]); // Dipendenze aggiornate

  return nodePositions;
};