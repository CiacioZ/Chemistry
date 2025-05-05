// Definizione della posizione assoluta di un elemento nel diagramma
// Questa interfaccia viene usata per tracciare la posizione esatta di un nodo
export interface Position {
    x: number;      // Posizione orizzontale rispetto al container
    y: number;      // Posizione verticale rispetto al container
    width: number;  // Larghezza dell'elemento
    height: number; // Altezza dell'elemento
  }
  
  // Definizione della posizione relativa di un nodo nel diagramma
  // Usata per posizionare i nodi nell'area di lavoro
  export interface NodePosition {
    left: number;   // Distanza dal bordo sinistro del container
    top: number;    // Distanza dal bordo superiore del container
  }
  
  // Mappa che associa gli ID dei nodi alle loro posizioni
  export interface NodePositions {
    [key: string]: Position;
  }
  
  // Interfaccia base per tutti i tipi di nodo
  export interface BaseNode {
    id: string;     // Identificatore univoco del nodo
    type: 'action' | 'state';  // Tipo del nodo
    label: string;
    position: NodePosition;    // Posizione del nodo nell'area di lavoro
    connections: {
      in: string[];           // Array di ID dei nodi che si collegano a questo nodo
      out: string | null;     // ID del nodo a cui questo nodo si collega (null se non collegato)
    };
  }
  
  // Interfaccia specifica per i nodi di tipo Action
  export interface ActionNode extends BaseNode {
    type: 'action';
    from: string;    // Chi esegue l'azione
    verb: string;    // Quale azione viene eseguita
    to: string;      // Su chi/cosa viene eseguita l'azione
    with: string;    // Con quale strumento/mezzo
    where: string;   // Dove viene eseguita l'azione
  }
  
  // Interfaccia specifica per i nodi di tipo State
  export interface StateNode extends BaseNode {
    type: 'state';
    description: string;  // Descrizione dello stato
  }
  
  // Tipo unione per rappresentare qualsiasi tipo di nodo
  export type Node = ActionNode | StateNode;
  
  // Stato per la gestione del drag and drop
  export interface DragState {
    isDragging: boolean;       // Indica se un nodo è in fase di trascinamento
    currentNode: string | null; // ID del nodo che viene trascinato
    offset: {
      x: number;              // Offset orizzontale del punto di click
      y: number;              // Offset verticale del punto di click
    };
  }
  
  // Stato per la gestione delle connessioni in corso
  export interface ConnectionDragState {
    isConnecting: boolean;     // Indica se è in corso una connessione
    sourceNode: string | null; // ID del nodo di origine della connessione
    sourcePosition: {          // Posizione di partenza della connessione
      x: number;
      y: number;
    } | null;
  }

export type EntityType = 'Character' | 'Item' | 'Location';

export interface Entity {
  type: EntityType;
  name: string;
  internal: boolean;
}

export const PREDEFINED_ENTITIES: Entity[] = [
  { type: 'Character', name: 'MAIN_CHARACTER', internal: true },
  { type: 'Item', name: 'NOTHING', internal: true },
  { type: 'Item', name: 'SOMETHING', internal: true },
  { type: 'Location', name: 'EVERYWHERE', internal: true }
];

export const VERBS = ['Talk to', 'Go to', 'Interact with'] as const;
export type VerbType = typeof VERBS[number];