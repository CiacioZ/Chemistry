import { useState, RefObject } from 'react';
import { Node, DragState } from '../types/index';

interface UseDragAndDropProps {
  nodes: Node[];
  workspaceRef: RefObject<HTMLDivElement | null>;
  pushNodes: (nodes: Node[]) => void;
}

export const useDragAndDrop = ({ nodes, workspaceRef, pushNodes }: UseDragAndDropProps) => {
  const [tempNodes, setTempNodes] = useState<Node[]>([]);
  const [draggingNode, setDraggingNode] = useState<DragState>({
    isDragging: false,
    currentNode: null,
    offset: { x: 0, y: 0 }
  });

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // Ignoriamo il drag se stiamo cliccando su un input o un pulsante
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input' ||
        (e.target as HTMLElement).tagName.toLowerCase() === 'button') {
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDraggingNode({
      isDragging: true,
      currentNode: nodeId,
      offset: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    });
    
    // Inizializziamo tempNodes con i nodi attuali
    setTempNodes(nodes);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNode.isDragging && draggingNode.currentNode && workspaceRef.current) {
      const containerRect = workspaceRef.current.getBoundingClientRect();
      const scrollLeft = workspaceRef.current.scrollLeft;
      const scrollTop = workspaceRef.current.scrollTop;
      
      const newLeft = e.clientX - containerRect.left - draggingNode.offset.x + scrollLeft;
      const newTop = e.clientY - containerRect.top - draggingNode.offset.y + scrollTop;

      const newNodes = tempNodes.map(node => {
        if (node.id === draggingNode.currentNode) {
          return {
            ...node,
            position: {
              left: Math.max(0, newLeft),
              top: Math.max(0, newTop)
            }
          };
        }
        return node;
      });
      setTempNodes(newNodes);
    }
  };

  const handleMouseUp = () => {
    if (draggingNode.isDragging && tempNodes.length > 0) {
      // Salviamo la posizione finale solo quando il drag termina
      pushNodes(tempNodes);
      setTempNodes([]);
    }
    
    setDraggingNode({
      isDragging: false,
      currentNode: null,
      offset: { x: 0, y: 0 }
    });
  };

  const getCurrentNodes = () => draggingNode.isDragging ? tempNodes : nodes;

  return {
    tempNodes,
    draggingNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCurrentNodes
  };
};