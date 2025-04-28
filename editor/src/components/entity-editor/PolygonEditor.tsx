'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Tipi base
interface Point {
  x: number;
  y: number;
}

type Polygon = Point[];

// Informazioni sul vertice selezionato/trascinato
interface VertexInfo {
  polygonIndex: number; // Indice del poligono in 'polygons' o -1 per 'currentPolygon'
  vertexIndex: number; // Indice del vertice nel poligono
}


interface PolygonEditorProps {
  initialImageUrl?: string | null; // URL immagine iniziale (opzionale)
  initialPolygons?: Polygon[]; // Poligoni iniziali (opzionale)
  onSave?: (polygons: Polygon[], imageUrl: string | null) => void; // Callback per salvare
  imageUploadService?: (file: File) => Promise<string>; // Funzione per caricare l'immagine (opzionale)
}

// Costante per la tolleranza del click sui vertici
const VERTEX_CLICK_TOLERANCE = 8; // Pixel sul canvas

export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  initialImageUrl = null,
  initialPolygons = [],
  onSave,
  imageUploadService, // Funzione per gestire l'upload effettivo
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [polygons, setPolygons] = useState<Polygon[]>(initialPolygons);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Stato per tracciare il vertice trascinato
  const [draggingVertexInfo, setDraggingVertexInfo] = useState<VertexInfo | null>(null);
  // Stato per indicare il vertice sotto il mouse (hover) - Opzionale per UX
  const [hoveredVertexInfo, setHoveredVertexInfo] = useState<VertexInfo | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs per accedere allo stato aggiornato nei listener globali
  const polygonsRef = useRef(polygons);
  const currentPolygonRef = useRef(currentPolygon);
  const draggingVertexInfoRef = useRef(draggingVertexInfo);

  // Aggiorna i ref quando lo stato cambia
  useEffect(() => { polygonsRef.current = polygons; }, [polygons]);
  useEffect(() => { currentPolygonRef.current = currentPolygon; }, [currentPolygon]);
  useEffect(() => { draggingVertexInfoRef.current = draggingVertexInfo; }, [draggingVertexInfo]);


  // Funzione per calcolare le coordinate relative all'immagine (naturali)
  const getNaturalCoordinates = useCallback((e: MouseEvent | React.MouseEvent): Point | null => {
    if (!imageRef.current || !canvasRef.current || !imageSize) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Le coordinate dell'evento mouse sono relative al viewport
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Scala per convertire da dimensioni visualizzate (canvas) a dimensioni naturali (immagine)
    // Usiamo imageRef.current.clientWidth/Height perché il canvas è scalato su queste dimensioni
    const displayedWidth = imageRef.current.clientWidth;
    const displayedHeight = imageRef.current.clientHeight;

    // Evita divisione per zero
    if (displayedWidth === 0 || displayedHeight === 0) return null;

    const scaleX = imageSize.width / displayedWidth;
    const scaleY = imageSize.height / displayedHeight;

    // Coordinate naturali
    const naturalX = canvasX * scaleX;
    const naturalY = canvasY * scaleY;

    // Assicurati che le coordinate siano entro i limiti dell'immagine naturale (opzionale ma buona pratica)
     if (naturalX < 0 || naturalY < 0 || naturalX > imageSize.width || naturalY > imageSize.height) {
        return null;
     }

    return { x: naturalX, y: naturalY };
  }, [imageSize]); // Dipende da imageSize


  // Funzione per trovare un vertice vicino a un punto del canvas
  // Accetta coordinate del canvas (pixel sullo schermo)
  const findNearbyVertex = useCallback((canvasPoint: { x: number; y: number }): VertexInfo | null => {
    if (!imageSize || !canvasRef.current || !imageRef.current) return null;
    const canvas = canvasRef.current;
    const imageElement = imageRef.current;

    // Scala per convertire da coordinate naturali a coordinate canvas visualizzate
    // Usiamo le dimensioni visualizzate del canvas/immagine
    const scaleX = imageElement.clientWidth / imageSize.width;
    const scaleY = imageElement.clientHeight / imageSize.height;

    // Controlla poligoni esistenti
    for (let i = 0; i < polygonsRef.current.length; i++) { // Usa ref per stato aggiornato
      const poly = polygonsRef.current[i];
      for (let j = 0; j < poly.length; j++) {
        const vertex = poly[j];
        const vertexCanvasX = vertex.x * scaleX;
        const vertexCanvasY = vertex.y * scaleY;
        const distance = Math.sqrt(Math.pow(canvasPoint.x - vertexCanvasX, 2) + Math.pow(canvasPoint.y - vertexCanvasY, 2));
        if (distance <= VERTEX_CLICK_TOLERANCE) {
          return { polygonIndex: i, vertexIndex: j };
        }
      }
    }

    // Controlla poligono corrente
    for (let j = 0; j < currentPolygonRef.current.length; j++) { // Usa ref per stato aggiornato
        const vertex = currentPolygonRef.current[j];
        const vertexCanvasX = vertex.x * scaleX;
        const vertexCanvasY = vertex.y * scaleY;
        const distance = Math.sqrt(Math.pow(canvasPoint.x - vertexCanvasX, 2) + Math.pow(canvasPoint.y - vertexCanvasY, 2));
        if (distance <= VERTEX_CLICK_TOLERANCE) {
          return { polygonIndex: -1, vertexIndex: j }; // Usa -1 per indicare currentPolygon
        }
    }

    return null;
  }, [imageSize]); // Dipende solo da imageSize e dalla funzione di scala (i dati dei poligoni li legge dai ref)


  // Disegna sul canvas
  const draw = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !imageSize) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageElement = imageRef.current;
    // Adatta dimensioni canvas a quelle visualizzate dell'immagine
    const displayedWidth = imageElement.clientWidth;
    const displayedHeight = imageElement.clientHeight;

    // Evita di disegnare su un canvas di dimensione zero
    if (displayedWidth === 0 || displayedHeight === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Pulisci comunque
        return;
    }

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;


    // Pulisci canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scala per disegnare (da coordinate naturali a coordinate canvas visualizzate)
    const scaleX = canvas.width / imageSize.width;
    const scaleY = canvas.height / imageSize.height;

    // Funzione helper per disegnare i vertici
    const drawVertex = (vertex: Point, color: string, radius: number, isHovered: boolean, isDragging: boolean) => {
        ctx.beginPath();
        const currentRadius = isDragging ? 7 : (isHovered ? 6 : radius);
        ctx.arc(vertex.x * scaleX, vertex.y * scaleY, currentRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
         // Disegna un contorno per evidenziare
        if (isHovered || isDragging) {
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    };

    // --- Disegna Poligoni Esistenti e i loro vertici ---
    polygons.forEach((poly, polyIndex) => {
      if (poly.length < 1) return;
      ctx.beginPath();
      ctx.moveTo(poly[0].x * scaleX, poly[0].y * scaleY);
      poly.slice(1).forEach(p => ctx.lineTo(p.x * scaleX, p.y * scaleY));
      if (poly.length > 1) { // Chiudi il percorso anche per 2 punti (diventa una linea chiusa)
          ctx.closePath();
      } else if (poly.length === 1) {
           // Se c'è solo un punto, disegna solo quello (opzionale)
           drawVertex(poly[0], 'rgba(255, 0, 0, 0.8)', 4, false, false);
           return; // Passa al poligono successivo
      }

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Rosso per poligoni salvati
      ctx.lineWidth = 2;
      ctx.stroke();

      // Disegna vertici dei poligoni salvati
      poly.forEach((p, vertexIndex) => {
          const isHovered = hoveredVertexInfo?.polygonIndex === polyIndex && hoveredVertexInfo?.vertexIndex === vertexIndex;
          const isDragging = draggingVertexInfo?.polygonIndex === polyIndex && draggingVertexInfo?.vertexIndex === vertexIndex;
          drawVertex(p, 'rgba(255, 0, 0, 0.8)', 4, isHovered, isDragging);
      });
    });

    // --- Disegna Poligono Corrente e i suoi vertici ---
    if (currentPolygon.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x * scaleX, currentPolygon[0].y * scaleY);
      currentPolygon.slice(1).forEach(p => ctx.lineTo(p.x * scaleX, p.y * scaleY));

       // Disegna la linea che segue il mouse solo se stiamo disegnando E abbiamo almeno 2 punti
       // Nota: Per farlo correttamente, avremmo bisogno della posizione del mouse *attuale* nel `draw`,
       // che non viene passata qui. Saltiamo questo per semplicità e focus sulla richiesta.
       // Se volessi implementarlo, dovresti aggiungere uno stato `mousePosition` aggiornato
       // nell'handleMouseMove e passarlo come dipendenza a draw.

      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Verde per poligono in corso
      ctx.lineWidth = 2;
      ctx.stroke();

      // Disegna pallini sui vertici del poligono corrente
      currentPolygon.forEach((p, vertexIndex) => {
        const isHovered = hoveredVertexInfo?.polygonIndex === -1 && hoveredVertexInfo?.vertexIndex === vertexIndex;
        const isDragging = draggingVertexInfo?.polygonIndex === -1 && draggingVertexInfo?.vertexIndex === vertexIndex;
        drawVertex(p, 'rgba(0, 255, 0, 0.8)', 4, isHovered, isDragging);
      });
    }
  }, [polygons, currentPolygon, imageSize, draggingVertexInfo, hoveredVertexInfo]); // Aggiunte dipendenze dragging/hovered

  // Aggiorna il disegno quando cambiano i dati o la dimensione dell'immagine
  useEffect(() => {
    draw();
  }, [draw]); // draw è memoizzata con useCallback


  // Gestione caricamento immagine
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
      // Forza ridisegno dopo caricamento immagine (richiederà che draw abbia imageSize)
      // La dependency array di draw include imageSize, quindi useEffect chiamerà draw
      // Alternativa: requestAnimationFrame(draw); ma useEffect è più reattivo ai cambiamenti di stato/dipendenze
    }
  }, []); // Nessuna dipendenza

   // Gestione resize finestra per ridisegnare
   useEffect(() => {
    const handleResize = () => {
        // Ridisegna quando la finestra cambia dimensione,
        // perché le dimensioni del canvas/immagine potrebbero cambiare
        requestAnimationFrame(draw);
    };
    window.addEventListener('resize', handleResize);
    // Assicurati di ridisegnare almeno una volta dopo il mount se l'immagine è già caricata
    // (handled by useEffect([draw])), ma anche se la dimensione dell'immagine viene impostata
    // (handled by useEffect([draw]) because draw depends on imageSize)
    return () => window.removeEventListener('resize', handleResize);
   }, [draw]); // Dipende da draw


  // Gestione eventi mouse - SOLO canvas (mousedown, mousemove)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageUrl || isUploading || !imageSize) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // 1. Controlla se stiamo cliccando su un vertice esistente
    const nearbyVertex = findNearbyVertex(canvasPoint);
    if (nearbyVertex) {
        e.preventDefault(); // Previene default se si inizia un drag
        setIsDrawing(false); // Non stiamo disegnando un nuovo poligono (il drag è un'altra modalità)
        setDraggingVertexInfo(nearbyVertex);
        // Quando inizi a trascinare, non aggiungi un nuovo punto
        return;
    }

    // 2. Se non stiamo trascinando un vertice, procedi con la logica di disegno
    // Richiedi solo il tasto sinistro per aggiungere punti
    if (e.button !== 0) return; // Solo tasto sinistro

    const naturalPoint = getNaturalCoordinates(e);
    if (!naturalPoint) return;

    // Se non stiamo disegnando, inizia un nuovo poligono
    if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPolygon([naturalPoint]);
    } else {
         // Se stiamo già disegnando, aggiungi un punto
        setCurrentPolygon(prev => [...prev, naturalPoint]);
    }

    // Nota: Non c'è più la logica per chiudere il poligono qui (come con il doppio click vicino al primo punto)
  };

  // Gestione movimento mouse - SOLO canvas (per hover e per aggiornare posizione durante drag)
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageUrl || isUploading || !imageSize) return;
     const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Gestione trascinamento vertice (aggiorna posizione)
    if (draggingVertexInfo) {
      e.preventDefault(); // Previene selezione
      const naturalPoint = getNaturalCoordinates(e);
      if (!naturalPoint) return;

      const { polygonIndex, vertexIndex } = draggingVertexInfo;
      if (polygonIndex === -1) { // Modifica currentPolygon
        setCurrentPolygon(prev => {
          const newPoly = [...prev];
          newPoly[vertexIndex] = { ...naturalPoint }; // Crea nuovo oggetto punto
          return newPoly;
        });
      } else { // Modifica un poligono esistente
        setPolygons(prev => {
          const newPolys = [...prev];
          const newPoly = [...newPolys[polygonIndex]];
          newPoly[vertexIndex] = { ...naturalPoint }; // Crea nuovo oggetto punto
          newPolys[polygonIndex] = newPoly;
          return newPolys;
        });
      }
       // Non aggiornare hover mentre trascini
      setHoveredVertexInfo(null);
    } else {
        // Gestione Hover (quando NON stiamo trascinando)
        const nearbyVertex = findNearbyVertex(canvasPoint);
        setHoveredVertexInfo(nearbyVertex); // Imposta o null se non c'è nessun vertice vicino
    }
  };

   // Gestione mouse up - GLOBALE (per terminare trascinamento anche fuori dal canvas)
   const handleGlobalMouseUp = useCallback(() => {
       if (draggingVertexInfoRef.current !== null) { // Usa ref per lo stato aggiornato
           setDraggingVertexInfo(null); // Termina il trascinamento
       }
   }, []); // Dipende da draggingVertexInfoRef (implicito tramite chiusura), ma non ha bisogno di essere ricreata

   // Gestione mouse move - GLOBALE (per aggiornare posizione durante trascinamento anche fuori dal canvas)
   const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
       if (draggingVertexInfoRef.current !== null && canvasRef.current && imageRef.current && imageSize) {
            // Usa l'evento nativo e la funzione getNaturalCoordinates
           const naturalPoint = getNaturalCoordinates(e);
           if (!naturalPoint) return;

           const { polygonIndex, vertexIndex } = draggingVertexInfoRef.current; // Usa ref
           if (polygonIndex === -1) { // Modifica currentPolygon
               setCurrentPolygon(prev => {
                   const newPoly = [...prev];
                   newPoly[vertexIndex] = { ...naturalPoint };
                   return newPoly;
               });
           } else { // Modifica un poligono esistente
               setPolygons(prev => {
                   const newPolys = [...prev];
                   const newPoly = [...newPolys[polygonIndex]];
                   newPoly[vertexIndex] = { ...naturalPoint };
                   newPolys[polygonIndex] = newPoly;
                   return newPolys;
               });
           }
           // Non aggiornare hover nel listener globale
           setHoveredVertexInfo(null);
       }
   }, [imageSize, getNaturalCoordinates]); // Dipende da imageSize e getNaturalCoordinates

    // Aggiungi listener globali per mouse move/up al mount e rimuovi al unmount
    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => { // Cleanup function
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [handleGlobalMouseMove, handleGlobalMouseUp]); // Le callbacks sono memoizzate, quindi questo effetto si aggiunge/rimuove solo al mount/unmount

    // Gestione mouse leave dal canvas (per resettare hover)
    const handleCanvasMouseLeave = () => {
        // Resetta hoveredVertexInfo solo se NON stiamo trascinando
        if (!draggingVertexInfo) {
             setHoveredVertexInfo(null);
        }
    };

  // --- NUOVA FUNZIONE: Finalizza Poligono Corrente ---
  const handleFinishDrawing = () => {
      if (isDrawing && currentPolygon.length >= 3) {
          setPolygons(prev => [...prev, currentPolygon]); // Salva il poligono completato
          setCurrentPolygon([]); // Resetta il poligono corrente
          setIsDrawing(false);
          setHoveredVertexInfo(null); // Resetta stato hover
      } else if (isDrawing && currentPolygon.length > 0) {
           alert('Impossibile chiudere il poligono: richiede almeno 3 punti. Usa "Cancel Current" per annullare.');
      }
      // Se non sta disegnando, il bottone sarà disabilitato.
  };


  // Gestione upload file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Usa URL temporaneo per l'anteprima
      const tempUrl = URL.createObjectURL(file);
      setImageUrl(tempUrl);
      setPolygons([]); // Resetta i poligoni quando cambia immagine
      setCurrentPolygon([]);
      setIsDrawing(false);
      setImageSize(null); // Resetta image size finché non carica

      // Se fornita, usa la funzione di upload esterna
      if (imageUploadService) {
        setIsUploading(true);
        try {
          const permanentUrl = await imageUploadService(file);
          setImageUrl(permanentUrl); // Aggiorna con l'URL permanente
          console.log('Upload completato:', permanentUrl);
          // Non chiamare onSave qui, l'utente deve salvare esplicitamente
        } catch (error) {
          console.error("Errore durante l'upload:", error);
          alert("Errore durante il caricamento dell'immagine.");
          setImageUrl(null); // Rimuovi l'immagine se l'upload fallisce
           // Rimuovi l'URL temporaneo se l'upload fallisce
           URL.revokeObjectURL(tempUrl);
        } finally {
          setIsUploading(false);
        }
      } else {
        // Se non c'è servizio di upload, l'URL rimane temporaneo (blob)
        console.warn("Nessun 'imageUploadService' fornito. L'immagine non verrà salvata permanentemente se non tramite onSave.");
      }
    }
     // Resetta l'input per permettere ricarica stesso file
     if(e.target) e.target.value = '';
  };

  // Trigger input file
  const triggerFileInput = () => {
    // Assicurati che non stiamo caricando
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // Bottone Salva
  const handleSaveClick = () => {
    // Se stai disegnando, non permettere di salvare finché il poligono corrente non è finalizzato o annullato.
    // Questo per evitare ambiguità su cosa significa "salva" mentre si disegna.
    // In alternativa, potresti voler finalizzare il poligono corrente automaticamente al click di "Save"
    // se ha almeno 3 punti, come faceva la versione precedente. Manteniamo la logica precedente per
    // compatibilità, ma l'UX è migliore se l'utente finalizza esplicitamente O annulla.
    // Decidiamo di mantenere la logica precedente: "Save" finalizza il poligono corrente *se* valido.

    let polygonsToSave = polygons;
    let finishedCurrent = false;

    if (isDrawing && currentPolygon.length >= 3) {
       // Finalizza poligono corrente e aggiungilo alla lista per il salvataggio
       polygonsToSave = [...polygons, currentPolygon];
       finishedCurrent = true;
    } else if (isDrawing && currentPolygon.length > 0) {
        // Se sta disegnando ma il poligono non è valido (meno di 3 punti),
        // non lo includiamo nel salvataggio e avvisiamo. NON annulliamo automaticamente il disegno qui
        // per non perdere il lavoro, l'utente deve usare "Cancel Current".
         alert('Poligono corrente incompleto (meno di 3 punti). Non incluso nel salvataggio.');
         // polygonsToSave rimane 'polygons' (non include l'incompleto currentPolygon)
         // Non aggiorniamo lo stato locale del disegno qui.
    }

    // Se un poligono corrente è stato finalizzato *durante* questo click su "Save",
    // aggiorna lo stato locale.
    if (finishedCurrent) {
         setPolygons(polygonsToSave); // polygonsToSave include il poligono appena finalizzato
         setCurrentPolygon([]);
         setIsDrawing(false);
         setHoveredVertexInfo(null); // Resetta stato hover
    }

    // Chiama onSave con la lista finale di poligoni e l'URL corrente
    // Se finishedCurrent era false (o non stavi disegnando), polygonsToSave è semplicemente lo stato 'polygons' prima di questo handler.
    onSave?.(polygonsToSave, imageUrl);

    // Modificato messaggio in base a se un poligono è stato finalizzato o meno
    if (finishedCurrent) {
         alert('Poligono corrente finalizzato e dati mappa pronti per essere salvati!');
    } else {
         alert('Dati mappa (poligoni salvati) pronti per essere salvati!');
    }
  };


  // Bottone Annulla disegno corrente
  const handleCancelDrawing = () => {
      if (confirm('Sei sicuro di voler annullare il disegno corrente?')) {
          setCurrentPolygon([]);
          setIsDrawing(false);
          setHoveredVertexInfo(null); // Resetta stato hover
      }
  };

  // Bottone Rimuovi ultimo poligono salvato
  const handleRemoveLastPolygon = () => {
      if (polygons.length > 0) {
          setPolygons(prev => prev.slice(0, -1));
          setHoveredVertexInfo(null); // Resetta stato hover
      }
  };

  // Bottone Rimuovi tutti i poligoni (salvati + corrente se presente)
   const handleClearAllPolygons = () => {
       if (confirm('Sei sicuro di voler rimuovere tutti i poligoni?')) {
            setPolygons([]);
            setCurrentPolygon([]);
            setIsDrawing(false);
            setHoveredVertexInfo(null); // Resetta stato hover
       }
   };


  return (
    <div className="flex flex-col h-full">
      {/* Controlli */}
      <div className="mb-4 p-2 border-b flex flex-wrap items-center gap-2"> {/* Usato gap per spaziatura */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading} // Disabilita anche l'input file durante l'upload
        />
        <button
          onClick={triggerFileInput}
          disabled={isUploading}
          className={`px-3 py-1 text-sm rounded ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'} text-white disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          {isUploading ? 'Uploading...' : (imageUrl ? 'Change Image' : 'Load Image')}
        </button>

        {/* Mostra bottoni di azione solo se immagine caricata e size disponibile */}
        {imageUrl && !isUploading && imageSize && (
          <>
            {/* Bottone per finalizzare disegno corrente */}
            {isDrawing && (
                 <button
                   onClick={handleFinishDrawing}
                   disabled={currentPolygon.length < 3} // Abilitato solo con almeno 3 punti
                   className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
                 >
                   Finish Polygon ({currentPolygon.length} pts)
                 </button>
            )}

            {/* Bottone per annullare disegno corrente */}
             {isDrawing && (
                <button
                  onClick={handleCancelDrawing}
                  className="px-3 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                >
                  Cancel Current
                </button>
             )}

             {/* Bottone Rimuovi ultimo poligono salvato */}
             <button
                onClick={handleRemoveLastPolygon}
                disabled={isDrawing || polygons.length === 0} // Disabilitato durante disegno o se non ci sono salvati
                className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
             >
                Remove Last Saved
             </button>

             {/* Bottone Rimuovi tutti i poligoni */}
             <button
                onClick={handleClearAllPolygons}
                disabled={isDrawing || (polygons.length === 0 && currentPolygon.length === 0)} // Disabilitato se non c'è nulla
                className="px-3 py-1 text-sm bg-red-700 hover:bg-red-800 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
             >
                Clear All
             </button>

             {/* Bottone Salva Dati Mappa */}
             <button
              onClick={handleSaveClick}
              // Disabilita se stai disegnando un poligono incompleto (< 3 punti)
              disabled={isDrawing && currentPolygon.length > 0 && currentPolygon.length < 3}
              className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Save Polygons Data
            </button>

          </>
        )}
         {/* Stato corrente del disegno visibile */}
         {isDrawing && !isUploading && !draggingVertexInfo && (
            <span className="ml-4 text-sm text-gray-700 dark:text-gray-300">
                Click on image to add points.
            </span>
         )}
         {draggingVertexInfo && !isUploading && (
             <span className="ml-4 text-sm text-gray-700 dark:text-gray-300">
                 Dragging Vertex...
             </span>
         )}
         {imageUrl && !isDrawing && !isUploading && !draggingVertexInfo && (
              <span className="ml-4 text-sm text-gray-700 dark:text-gray-300">
                 Click on image to start a new polygon or drag existing vertices.
             </span>
         )}
      </div>

      {/* Area Immagine e Canvas */}
      <div className="flex-grow relative border rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center"> {/* Aggiunto flex center per messaggio immagine mancante */}
        {imageUrl ? (
          <>
            {/* Immagine di sfondo */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Location background"
              onLoad={handleImageLoad}
              // Gestione errori di caricamento immagine
              onError={(e) => {
                  console.error("Errore caricamento immagine:", e);
                  alert("Impossibile caricare l'immagine.");
                  setImageUrl(null); // Rimuovi l'URL se non carica
                  setPolygons([]);
                  setCurrentPolygon([]);
                  setIsDrawing(false);
                  setImageSize(null);
                  setIsUploading(false); // Assicurati che lo stato upload si resetti
                  setHoveredVertexInfo(null); // Resetta stato hover
                  setDraggingVertexInfo(null); // Resetta stato drag
              }}
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none" // object-contain e pointer-events-none
              style={{ zIndex: 1 }}
            />
            {/* Canvas per disegno */}
            {imageSize && !isUploading ? ( // Mostra canvas solo se immagine caricata e size disponibile, e non in upload
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ zIndex: 2, cursor: draggingVertexInfo ? 'grabbing' : (hoveredVertexInfo ? 'grab' : (isDrawing ? 'crosshair' : 'default')) }} // Cambia cursore
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={handleCanvasMouseLeave}
                  // Rimossa la prop onDoubleClick
                />
             ) : (
                 // Placeholder mentre l'immagine carica o size non disponibile
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading image...
                  </div>
             )}

             {/* Messaggio suggerimento per chiudere poligono */}
             {isDrawing && currentPolygon.length >= 3 && !isUploading && !draggingVertexInfo && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                    Click points or use "Finish Polygon" button.
                </div>
             )}
              {isDrawing && currentPolygon.length > 0 && currentPolygon.length < 3 && !isUploading && !draggingVertexInfo && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                    Add {3 - currentPolygon.length} more point(s) to finish. Use "Cancel Current" button to abort.
                </div>
             )}

             {isUploading && (
                 <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                    <span className="text-white text-lg">Uploading image...</span>
                 </div>
             )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Load an image to start drawing polygons.
          </div>
        )}
      </div>
    </div>
  );
};