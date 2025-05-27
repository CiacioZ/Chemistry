import { v4 as uuidv4 } from 'uuid';

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
    script?: string;  // Script da eseguire
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
  id: string;
  type: EntityType;
  name: string;
  internal: boolean;
  details?: AllEntityDetails; // Modifica: Aggiunto campo details opzionale
}

// Interfaccia per un singolo frame di animazione
export interface AnimationFrame {
  imageData: string; // Base64 o URL dell'immagine del frame
  duration?: number; // Durata del frame in millisecondi (opzionale)
}

// Interfaccia per un'animazione completa
export interface Animation {
  name: string;
  frames: AnimationFrame[];
  loop?: boolean; // Se l'animazione deve essere in loop
}

// E aggiorna CharacterDetails:
export interface CharacterDetails {
  description?: string;
  inventory?: string[];
  dialogueTree?: string;
  animations?: Animation[]; // Cambiato da { [id: string] : string ; }
  imageData?: string;
}

export interface ItemDetails {
  description?: string;
  canBePickedUp?: boolean;
  useWith: boolean;
  imageData?: string;
  inventoryImageData?: string;
  animations?: Animation[]; // Changed to use Animation interface array
}

// Aggiunta: Tipo unione per tutti i dettagli delle entità
export type AllEntityDetails = CharacterDetails | ItemDetails | LocationDetails;

export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export interface PlacedEntity {
  entityId: string; 
  position: Point;      
  interactionSpot: Point; // Nuovo campo per il punto di interazione
}

export interface LocationDetails {
  backgroundImage: string | null;
  walkableAreas: Polygon[];  
  description?: string;
  placedItems?: PlacedEntity[];
  placedCharacters?: PlacedEntity[];
}

export interface LocationEntity extends Entity {
  type: 'Location';
  details: LocationDetails;
}

export interface CharacterEntity extends Entity {
  type: 'Character';
  details: CharacterDetails;
}

export interface ItemEntity extends Entity {
  type: 'Item';
  details: ItemDetails;
}

// Tipo Entity come unione discriminata basata sulle interfacce specifiche
export type AnyEntity = LocationEntity | CharacterEntity | ItemEntity;


export const PREDEFINED_ENTITIES: AnyEntity[] = [ // Usiamo AnyEntity[] per maggiore specificità
  {
    id: 'main_character_guid', // ID GUID fisso per MAIN_CHARACTER
    type: 'Character',
    name: 'MAIN_CHARACTER',
    internal: false,
    details: {
      description: 'The main player character.',
      inventory: [],
      dialogueTree: undefined,
    }
  },
  {
    id: uuidv4(),
    type: 'Character',
    name: 'SOMEONE',
    internal: true,
    details: {
      inventory: [],
      dialogueTree: undefined, // o un valore di default appropriato
    }
  },
  {
    id: uuidv4(),
    type: 'Item',
    name: 'NOTHING',
    internal: true,
    details: {
      description: 'Nothing special.',
      canBePickedUp: false,
      imageData: '',
      inventoryImageData: '', 
      useWith: false 
    }
  },
  {
    id: uuidv4(),
    type: 'Item',
    name: 'SOMETHING',
    internal: true,
    details: {
      description: 'An interesting item.',
      canBePickedUp: true,
      inventoryImageData: '', 
      useWith: false 
    }
  },
  {
    id: uuidv4(),
    type: 'Location',
    name: 'EVERYWHERE',
    internal: true,
    details: {
      backgroundImage: null,
      walkableAreas: [],
      description: 'An ubiquitous place.'
    }
  }
];

export const VERBS = ['Talk to', 'Go to', 'Interact with'] as const;
export type VerbType = typeof VERBS[number];