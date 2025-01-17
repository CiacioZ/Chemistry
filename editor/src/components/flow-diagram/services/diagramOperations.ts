import { Node, NodePosition } from '../types';

const NODE_WIDTH = 200;   // Larghezza approssimativa di un nodo
const NODE_HEIGHT = 100;  // Altezza approssimativa di un nodo
const OFFSET = 50;       // Spostamento da applicare in caso di sovrapposizione

const isOverlapping = (pos1: NodePosition, pos2: NodePosition): boolean => {
  return Math.abs(pos1.left - pos2.left) < NODE_WIDTH &&
         Math.abs(pos1.top - pos2.top) < NODE_HEIGHT;
};

const findNonOverlappingPosition = (
  position: NodePosition,
  existingNodes: Node[]
): NodePosition => {
  let newPosition = { ...position };

  // Se c'è sovrapposizione, spostiamo il nodo in basso a destra
  while (existingNodes.some(node => isOverlapping(newPosition, node.position))) {
    newPosition = {
      left: newPosition.left + OFFSET,
      top: newPosition.top + OFFSET
    };
  }

  return newPosition;
};

export const diagramOperations = {
  createNode: (
    type: 'action' | 'state',
    position: NodePosition,
    container: HTMLElement | null,
    existingNodes: Node[] = []
  ): Node => {
    // Se abbiamo il container, calcoliamo il centro della viewport
    let nodePosition = position;
    if (container) {
      const centerX = container.scrollLeft + container.clientWidth / 2;
      const centerY = container.scrollTop + container.clientHeight / 2;
      nodePosition = {
        left: centerX - NODE_WIDTH/2,
        top: centerY - NODE_HEIGHT/2
      };
    }

    // Troviamo una posizione non sovrapposta
    const finalPosition = findNonOverlappingPosition(nodePosition, existingNodes);

    if (type === 'action') {
      return {
        id: `action-${Date.now()}`,
        type: 'action',
        label: 'New Action',
        position: finalPosition,
        connections: { in: [], out: null },
        from: '',
        verb: '',
        to: '',
        with: '',
        where: ''
      };
    } else {
      return {
        id: `state-${Date.now()}`,
        type: 'state',
        label: 'New State',
        position: finalPosition,
        connections: { in: [], out: null },
        description: ''
      };
    }
  },

  updateNode: (nodes: Node[], id: string, updates: Partial<Node>): Node[] => {
    return nodes.map(node => 
      node.id === id ? { ...node, ...updates } : node
    );
  },

  deleteNode: (nodes: Node[], id: string): Node[] => {
    return nodes
      .map(node => ({
        ...node,
        connections: {
          in: node.connections.in.filter(connId => connId !== id),
          out: node.connections.out === id ? null : node.connections.out
        }
      }))
      .filter(node => node.id !== id);
  },

  createConnection: (
    nodes: Node[],
    sourceId: string,
    targetId: string
  ): Node[] => {
    return nodes.map(node => {
      if (node.id === sourceId) {
        return {
          ...node,
          connections: {
            ...node.connections,
            out: targetId
          }
        };
      }
      if (node.id === targetId) {
        return {
          ...node,
          connections: {
            ...node.connections,
            in: [...node.connections.in, sourceId]
          }
        };
      }
      return node;
    });
  },

  removeConnection: (
    nodes: Node[],
    sourceId: string,
    targetId: string
  ): Node[] => {
    return nodes.map(node => {
      if (node.id === sourceId) {
        return {
          ...node,
          connections: {
            ...node.connections,
            out: null
          }
        };
      }
      if (node.id === targetId) {
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
  },

  updateNodePosition: (
    nodes: Node[],
    nodeId: string,
    position: NodePosition
  ): Node[] => {
    return nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          position: {
            left: Math.max(0, position.left),
            top: Math.max(0, position.top)
          }
        };
      }
      return node;
    });
  }
};