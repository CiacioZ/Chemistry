import { Node, NodePosition, ActionNode, StateNode } from '../types/index';

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
        connections: { in: [], out: [] },
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
        connections: { in: [], out: [] },
        description: ''
      };
    }
  },

  updateNode: (nodes: Node[], id: string, updates: Partial<Node>): Node[] => {
    return nodes.map(node => 
      node.id === id ? { ...node, ...updates } : node
    );
  },

  deleteNode: (nodes: Node[], idToDelete: string): Node[] => {
    return nodes
      .filter(node => node.id !== idToDelete) // Filtra prima il nodo da eliminare
      .map(node => { // Poi aggiorna le connessioni degli altri nodi
        const newIn = node.connections.in.filter((connId: string) => connId !== idToDelete);
        const newOut = node.connections.out.filter((connId: string) => connId !== idToDelete);

        // Se nessuna connessione è stata rimossa da questo nodo, restituisci il nodo originale
        if (node.connections.in.length === newIn.length && node.connections.out.length === newOut.length) {
          return node;
        }

        // Altrimenti, ricostruisci il nodo con le connessioni aggiornate
        if (node.type === 'action') {
          return {
            ...node, // Mantiene id, label, position, from, verb, to, with, where, script
            connections: { in: newIn, out: newOut }
          } as ActionNode;
        } else if (node.type === 'state') {
          return {
            ...node, // Mantiene id, label, position, description, flags
            connections: { in: newIn, out: newOut }
          } as StateNode;
        }
        // Questo fallback non dovrebbe essere raggiunto se Node è solo ActionNode | StateNode
        // Lancio un errore per indicare uno stato impossibile e per aiutare l'inferenza di tipo.
        throw new Error(`Unknown node type encountered in deleteNode: ${(node as any).type}`);
      });
  },

  createConnection: (
    nodes: Node[],
    sourceId: string,
    targetId: string
  ): Node[] => {
    console.log(`[diagramOperations] createConnection called. Source: ${sourceId}, Target: ${targetId}`);
    const sourceNodeInitial = nodes.find(n => n.id === sourceId);
    if (sourceNodeInitial) {
      console.log("[diagramOperations] Initial source node connections.out:", JSON.parse(JSON.stringify(sourceNodeInitial.connections.out)));
      console.log("[diagramOperations] Is connections.out an array?", Array.isArray(sourceNodeInitial.connections.out));
    } else {
      console.warn("[diagramOperations] Source node not found at start of createConnection");
    }

    return nodes.map(node => {
      if (node.id === sourceId) {
        console.log(`[diagramOperations] Processing source node ${sourceId}. Current out:`, JSON.parse(JSON.stringify(node.connections.out)));
        const newOutConnections = node.connections.out.includes(targetId)
          ? node.connections.out
          : [...node.connections.out, targetId];
        console.log(`[diagramOperations] New out connections for ${sourceId}:`, JSON.parse(JSON.stringify(newOutConnections)));
        return {
          ...node,
          connections: {
            ...node.connections,
            out: newOutConnections
          }
        };
      }
      if (node.id === targetId) {
        const newInConnections = node.connections.in.includes(sourceId)
          ? node.connections.in
          : [...node.connections.in, sourceId];
        return {
          ...node,
          connections: {
            ...node.connections,
            in: newInConnections
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
            out: node.connections.out.filter((id: string) => id !== targetId)
          }
        };
      }
      if (node.id === targetId) {
        return {
          ...node,
          connections: {
            ...node.connections,
            in: node.connections.in.filter((id: string) => id !== sourceId)
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