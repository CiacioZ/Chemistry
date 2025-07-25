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
      out: string[];     // MODIFICATO: ID del nodo a cui questo nodo si collega (null se non collegato)
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
  
  // Interfaccia per un singolo flag di nodo
  export interface NodeFlag {
    name: string;
    value: boolean;
  }
  
  // Interfaccia specifica per i nodi di tipo State
  export interface StateNode extends BaseNode {
    type: 'state';
    description: string;  // Descrizione dello stato
    flags?: NodeFlag[]; // Array di flag per lo stato
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

export type EntityType = 'Character' | 'Item' | 'Location' | 'Action' | 'Font' | 'Script' | 'Cursor';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  internal?: boolean;
  details?: EntityDetails;
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
  description: string;
  imageData: string;
  inventoryImageData?: string;
  animations?: Animation[];
  interactionSpot?: Point; // Aggiunto per il punto di interazione
  talkColor?: string; // Colore del testo dei dialoghi (es: #RRGGBB)
}

export interface ItemDetails {
  description: string;
  imageData: string;
  canBePickedUp?: boolean;
  inventoryImageData?: string;
  animations?: Animation[];
  useWith?: boolean; // For use with actions
  interactionSpot?: Point; // Aggiunto per il punto di interazione
}

export interface LocationDetails {
  description: string;
  backgroundImage?: string;
  walkableArea?: Point[][]; // Array di poligoni (Point[])
  polygons?: Polygon[]; // Updated to use the Polygon interface
  placedItems?: PlacedEntity[];
  placedCharacters?: PlacedEntity[];
  backgroundColor?: string;
}

export interface FontDetails {
  fontFileUrl: string;
}

export interface ScriptDetails {
  scriptContent: string;
}

// Dettagli per il cursore
export interface CursorDetails {
  animations: Animation[];
}

export type EntityDetails = CharacterDetails | ItemDetails | LocationDetails | ActionDetails | FontDetails | ScriptDetails | CursorDetails;

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

export interface LocationEntity extends Entity {
  type: 'Location';
  details?: LocationDetails;
}

export interface CharacterEntity extends Entity {
  type: 'Character';
  details?: CharacterDetails;
}

export interface ItemEntity extends Entity {
  type: 'Item';
  details?: ItemDetails;
}

export interface ActionEntity extends Entity {
  type: 'Action';
  details?: ActionDetails;
}

export interface FontEntity extends Entity {
  type: 'Font';
  details?: FontDetails;
}

export interface ScriptEntity extends Entity {
  type: 'Script';
  details?: ScriptDetails;
}

export interface CursorEntity extends Entity {
  type: 'Cursor';
  details?: CursorDetails;
}

// Tipo Entity come unione discriminata basata sulle interfacce specifiche
export type AnyEntity = CharacterEntity | ItemEntity | LocationEntity | ActionEntity | FontEntity | ScriptEntity | CursorEntity;

// Placeholder for ActionDetails - define its fields as needed
export interface ActionDetails {
    actionType?: string; // Example field, replace with actual fields
    targetEntityId?: string; // Example field
    // Add other fields specific to actions
}

export const PREDEFINED_ENTITIES: AnyEntity[] = [
    {
        id: uuidv4(), // Generate GUID
        type: 'Character',
        name: 'SOMEONE',
        internal: true,
        details: {
            description: 'A generic character',
            imageData: '', // Add empty string for imageData
            // inventory: [], // Removed
            // dialogueTree: undefined, // Removed
        }
    },
    {
        id: uuidv4(), // Generate GUID
        type: 'Item',
        name: 'NOTHING',
        internal: true,
        details: {
            description: 'Represents no item.',
            imageData: '', // Add empty string for imageData
            canBePickedUp: false,
            useWith: false,
        }
    },
    {
        id: uuidv4(), // Generate GUID
        type: 'Item',
        name: 'SOMETHING',
        internal: true,
        details: {
            description: 'Represents any item.',
            imageData: '', // Add empty string for imageData
            canBePickedUp: true,
            inventoryImageData: '', // Add empty string
            useWith: false,
        }
    },
    {
        id: uuidv4(), // Generate GUID
        type: 'Location',
        name: 'EVERYWHERE',
        internal: true,
        details: {
            description: 'A generic location for the player.',
            backgroundImage: '', // Changed from null to empty string
            // walkableAreas: [], // Changed to walkableArea
            walkableArea: [],
        }
    },
    {
        id: uuidv4(), // Generate GUID
        type: 'Cursor',
        name: 'DEFAULT_CURSOR',
        internal: true,
        details: {
            animations: [],
        }
    }
];

export const VERBS = ['Talk to', 'Go to', 'Interact with', 'Look at', 'Move to'] as const;
export type VerbType = typeof VERBS[number];