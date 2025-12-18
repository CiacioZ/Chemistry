'use client';

import React, { useState, useRef, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { Polygon, Point, Entity, LocationEntity, LocationDetails, PlacedEntity } from '../flow-diagram/types/index';



// Informazioni sul vertice selezionato/trascinato
interface VertexInfo {
  polygonIndex: number; // Indice del poligono in 'polygons' o -1 per 'currentPolygon'
  vertexIndex: number; // Indice del vertice nel poligono
}


interface PolygonEditorProps {
  locationId: string; // ID of the location entity being edited
  initialImageUrlFromEntity?: string | null;
  initialPolygonsFromEntity?: Polygon[]; // Loaded from walkableArea in entity details
  entities: Entity[]; // Full list of entities from context
  setEntities: (entities: Entity[]) => void; // Updater function from context
  imageUploadService?: (file: File) => Promise<string>;
}

// Costante per la tolleranza del click sui vertici
const VERTEX_CLICK_TOLERANCE = 8; // Pixel sul canvas
const EDGE_CLICK_TOLERANCE = 5; // Pixel sul canvas per cliccare su un lato

// Informazioni sul lato selezionato
interface EdgeInfo {
  polygonIndex: number; // Indice del poligono in 'polygons' o -1 per 'currentPolygon'
  vertexStartIndex: number; // Indice del primo vertice del lato nel poligono
}

export const PolygonEditor: React.FC<PolygonEditorProps> = ({
  locationId,
  initialImageUrlFromEntity,
  initialPolygonsFromEntity,
  entities,
  setEntities,
  imageUploadService,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrlFromEntity || null);
  const [polygons, setPolygons] = useState<Polygon[]>(initialPolygonsFromEntity || []); // Internal state, saved as walkableArea
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

  // Ref per tracciare se il primo rendering/aggiornamento da props è completo per la location corrente
  const firstRenderDoneRef = useRef(false);

  // Aggiorna i ref quando lo stato cambia
  useEffect(() => { polygonsRef.current = polygons; }, [polygons]);
  useEffect(() => { currentPolygonRef.current = currentPolygon; }, [currentPolygon]);
  useEffect(() => { draggingVertexInfoRef.current = draggingVertexInfo; }, [draggingVertexInfo]);

  useEffect(() => {
    setImageUrl(initialImageUrlFromEntity || null);
    setPolygons(initialPolygonsFromEntity || []);
    setCurrentPolygon([]);
    setIsDrawing(false);
    firstRenderDoneRef.current = false; // Resetta per la nuova location, per saltare il primo auto-save
    // imageSize will be re-evaluated when imageUrl changes and the image loads
  }, [locationId, initialImageUrlFromEntity, initialPolygonsFromEntity]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const persistChangesToContext = useCallback(() => {
    const updatedEntities = entities.map(entity => {
      if (entity.type === 'Location' && entity.id === locationId) {
        const locEntity = entity as LocationEntity;
        // Ensure a base for details, providing defaults for all LocationDetails fields
        const baseDetails: LocationDetails = {
            description: '',
            backgroundImage: '',
            walkableArea: [], // Polygon[] - this is what gets saved to JSON
            placedItems: [],
            placedCharacters: [],
            backgroundColor: '',
            ...(locEntity.details || {}), // Spread existing details over defaults
        };

        return {
          ...locEntity,
          details: {
            ...baseDetails, // Spread the comprehensive base details first
            backgroundImage: imageUrl, // Update specific fields managed by PolygonEditor
            walkableArea: polygons,      // FIXED: Save as walkableArea for demo.json compatibility
            // description is preserved from baseDetails or existing locEntity.details
          },
        } as LocationEntity; // Ensure the returned object is cast to LocationEntity
      }
      return entity;
    });
    setEntities(updatedEntities);
    // console.log(`Location ${locationId} data updated in context.`);
  }, [locationId, imageUrl, polygons, entities, setEntities]);

  // Nuovo useEffect per il salvataggio automatico
  useEffect(() => {
    // Non salvare se non c'è un locationId o se un upload è in corso (verrà salvato al termine)
    if (!locationId || isUploading) {
      return;
    }

    // Salta il salvataggio automatico al primissimo rendering dopo che le props sono state applicate
    if (!firstRenderDoneRef.current) {
      firstRenderDoneRef.current = true; // Marca il primo rendering come completato
      return;
    }

    // Chiamato quando imageUrl o polygons cambiano (dopo il primo rendering)
    persistChangesToContext();
  }, [imageUrl, polygons, locationId, isUploading, persistChangesToContext]); // persistChangesToContext è incluso per correttezza se la sua istanza cambia

  // Funzione per calcolare le coordinate relative all'immagine (naturali)
  const getNaturalCoordinates = useCallback((e: MouseEvent | React.MouseEvent): Point | null => {
    if (!imageRef.current || !canvasRef.current || !imageSize) return null;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const displayedWidth = imageRef.current.clientWidth;
    const displayedHeight = imageRef.current.clientHeight;

    if (displayedWidth === 0 || displayedHeight === 0) return null;

    const scaleX = imageSize.width / displayedWidth;
    const scaleY = imageSize.height / displayedHeight;

    let naturalX = canvasX * scaleX;
    let naturalY = canvasY * scaleY;

    // Assicurati che le coordinate siano entro i limiti dell'immagine naturale prima dell'arrotondamento
    naturalX = Math.max(0, Math.min(imageSize.width, naturalX));
    naturalY = Math.max(0, Math.min(imageSize.height, naturalY));

    return { x: Math.round(naturalX), y: Math.round(naturalY) };
  }, [imageSize]);


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
  }, [imageSize]);


  // --- NUOVA FUNZIONE: Trova un lato vicino a un punto del canvas ---
  const findNearbyEdge = useCallback((canvasPoint: { x: number; y: number }): EdgeInfo | null => {
    if (!imageSize || !canvasRef.current || !imageRef.current) return null;
    const canvas = canvasRef.current;
    const imageElement = imageRef.current;

    const scaleX = imageElement.clientWidth / imageSize.width;
    const scaleY = imageElement.clientHeight / imageSize.height;

    const distToSegment = (p: Point, v: Point, w: Point): number => {
      const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
      if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
      let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
      return Math.sqrt((p.x - projection.x) ** 2 + (p.y - projection.y) ** 2);
    };

    const checkPolygonEdges = (polygonArray: Polygon[], polyIndexOffset: number): EdgeInfo | null => {
      for (let i = 0; i < polygonArray.length; i++) {
        const poly = polygonArray[i];
        if (poly.length < 2) continue;

        for (let j = 0; j < poly.length; j++) {
          const p1 = poly[j];
          const p2 = poly[(j + 1) % poly.length]; // Gestisce la chiusura del poligono

          // Converti i vertici del poligono (naturali) in coordinate canvas
          const v1Canvas = { x: p1.x * scaleX, y: p1.y * scaleY };
          const v2Canvas = { x: p2.x * scaleX, y: p2.y * scaleY };
          
          const distance = distToSegment(canvasPoint, v1Canvas, v2Canvas);

          if (distance <= EDGE_CLICK_TOLERANCE) {
            return { polygonIndex: polyIndexOffset === -1 ? -1 : i, vertexStartIndex: j };
          }
        }
      }
      return null;
    };

    // Controlla poligoni esistenti
    let edgeInfo = checkPolygonEdges(polygonsRef.current, 0);
    if (edgeInfo) return edgeInfo;

    // Controlla poligono corrente (se ha almeno 2 punti)
    if (currentPolygonRef.current.length >= 2) {
        // Temporaneamente tratta currentPolygon come un array di poligoni con un solo elemento
        edgeInfo = checkPolygonEdges([currentPolygonRef.current], -1);
        if (edgeInfo) return edgeInfo;
    }
    
    return null;
  }, [imageSize]);


  // Disegna sul canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const imageElement = imageRef.current; // Riferimento all'elemento <img>

    if (!canvas || !imageElement || !imageSize || !imageUrl) { // Assicurati che anche imageUrl sia presente
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Pulisci e disegna un placeholder se non c'è immagine
          canvas.width = canvas.parentElement?.clientWidth || 300; // Fallback a larghezza parente o default
          canvas.height = canvas.parentElement?.clientHeight || 200; // Fallback a altezza parente o default
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#666';
          ctx.textAlign = 'center';
          ctx.fillText('Image not loaded', canvas.width / 2, canvas.height / 2);
        }
      }
      return;
    }

    // Imposta le dimensioni del buffer del canvas alle dimensioni naturali dell'immagine
    canvas.width = imageSize.width;
    canvas.height = imageSize.height;

    // Imposta esplicitamente le dimensioni di visualizzazione dell'elemento <img>
    // alle sue dimensioni naturali. Questo assicura che imageElement.clientWidth/Height
    // corrispondano a imageSize.width/height.
    imageElement.style.width = `${imageSize.width}px`;
    imageElement.style.height = `${imageSize.height}px`;
    
    // Il canvas stesso (elemento HTML) dovrebbe anche avere stili CSS che corrispondono
    // per evitare distorsioni se il CSS lo sta scalando diversamente dal suo buffer.
    // Dato che è position:absolute e il suo parente è dimensionato con imageSize,
    // non dovrebbe essere necessario impostare qui gli stili width/height del canvas,
    // ma per sicurezza lo facciamo.
    canvas.style.width = `${imageSize.width}px`;
    canvas.style.height = `${imageSize.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pulisci canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dato che il canvas ora ha le stesse dimensioni dell'immagine naturale,
    // la scala è 1. Disegniamo direttamente con le coordinate naturali.
    const scaleX = 1; // canvas.width / imageSize.width;
    const scaleY = 1; // canvas.height / imageSize.height;

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
           drawVertex(poly[0], 'rgba(0, 255, 0, 0.8)', 4, false, false); // Verde per poligoni completati
           return; // Passa al poligono successivo
      }

      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Verde per poligoni completati
      ctx.lineWidth = 2;
      ctx.stroke();

      // Disegna vertici dei poligoni salvati
      poly.forEach((p, vertexIndex) => {
          const isHovered = hoveredVertexInfo?.polygonIndex === polyIndex && hoveredVertexInfo?.vertexIndex === vertexIndex;
          const isDragging = draggingVertexInfo?.polygonIndex === polyIndex && draggingVertexInfo?.vertexIndex === vertexIndex;
          drawVertex(p, 'rgba(0, 255, 0, 0.8)', 4, isHovered, isDragging); // Verde per poligoni completati
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

      ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // Rosso per poligono in corso
      ctx.lineWidth = 2;
      ctx.stroke();

      // Disegna pallini sui vertici del poligono corrente
      currentPolygon.forEach((p, vertexIndex) => {
        const isHovered = hoveredVertexInfo?.polygonIndex === -1 && hoveredVertexInfo?.vertexIndex === vertexIndex;
        const isDragging = draggingVertexInfo?.polygonIndex === -1 && draggingVertexInfo?.vertexIndex === vertexIndex;
        drawVertex(p, 'rgba(255, 0, 0, 0.8)', 4, isHovered, isDragging); // Rosso per poligono in corso
      });
    }
  }, [polygons, currentPolygon, imageSize, hoveredVertexInfo, draggingVertexInfo, imageUrl]); // Added imageUrl dependency

  // Effetto per ridisegnare quando i poligoni, l'immagine o la dimensione cambiano
  useEffect(() => {
    draw();
  }, [draw]); // draw is memoized with its dependencies

  // Effetto per caricare l'immagine e impostare le dimensioni
  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    } else {
      setImageSize(null);
      // Consider also clearing imageUrl if the image is invalid/missing
      // setImageUrl(null); 
    }
  }, []); // No dependencies needed here if not calling setImageUrl directly

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
        return;
    }

    // Solo tasto sinistro per le azioni successive
    if (e.button !== 0) return;

    const naturalClickPoint = getNaturalCoordinates(e);
    if (!naturalClickPoint) return;

    // 2. Controlla se stiamo cliccando su un lato esistente
    const nearbyEdge = findNearbyEdge(canvasPoint);
    if (nearbyEdge) {
        e.preventDefault();
        setIsDrawing(false); // Non stiamo disegnando un nuovo poligono

        const { polygonIndex, vertexStartIndex } = nearbyEdge;

        if (polygonIndex === -1) { // Lato del poligono corrente
            setCurrentPolygon(prev => {
                const newPoly = [...prev];
                newPoly.splice(vertexStartIndex + 1, 0, naturalClickPoint);
                return newPoly;
            });
            // Opzionale: inizia a trascinare il nuovo vertice
            setDraggingVertexInfo({ polygonIndex: -1, vertexIndex: vertexStartIndex + 1 });
        } else { // Lato di un poligono esistente
            setPolygons(prev => {
                const newPolys = [...prev];
                const targetPoly = [...newPolys[polygonIndex]];
                targetPoly.splice(vertexStartIndex + 1, 0, naturalClickPoint);
                newPolys[polygonIndex] = targetPoly;
                return newPolys;
            });
            // Opzionale: inizia a trascinare il nuovo vertice
            setDraggingVertexInfo({ polygonIndex: polygonIndex, vertexIndex: vertexStartIndex + 1 });
        }
        return;
    }


    // 3. Se non stiamo trascinando un vertice e non clicchiamo su un lato, procedi con la logica di disegno
    if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPolygon([naturalClickPoint]);
    } else {
        setCurrentPolygon(prev => [...prev, naturalClickPoint]);
    }
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
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      // console.log('No file selected.');
      return;
    }

    setIsUploading(true); // Imposta lo stato di caricamento per entrambi i casi

    if (imageUploadService) { // Metodo preferito: usa il servizio fornito
      try {
        const newImageUrl = await imageUploadService(file);
        setImageUrl(newImageUrl);
        // persistChangesToContext sarà chiamato dall'useEffect che osserva imageUrl
      } catch (error) {
        console.error('Error uploading image via service:', error);
        alert('Failed to upload image using service. Please try again.');
        setImageUrl(initialImageUrlFromEntity || null); // Opzionale: ripristina o imposta a null
      } finally {
        setIsUploading(false);
      }
    } else { // Fallback: converti in base64 se non viene fornito alcun servizio
      console.warn("PolygonEditor: imageUploadService is not provided. Converting image to base64 for local use.");
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          // reader.result contiene i dati come URL che rappresenta i dati del file come stringa codificata in base64
          setImageUrl(reader.result as string);
          setIsUploading(false);
          // persistChangesToContext sarà chiamato dall'useEffect che osserva imageUrl
        };
        reader.onerror = (error) => {
          console.error('Error converting file to base64:', error);
          alert('Failed to convert image to base64.');
          setImageUrl(initialImageUrlFromEntity || null); // Opzionale: ripristina o imposta a null
          setIsUploading(false);
        };
        reader.readAsDataURL(file); // Questo avvia la conversione
      } catch (error) { // Cattura errori sincroni dalla configurazione di FileReader (improbabile)
        console.error('Error setting up FileReader for base64 conversion:', error);
        alert('Failed to initiate image conversion.');
        setImageUrl(initialImageUrlFromEntity || null);
        setIsUploading(false);
      }
    }
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
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

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingVertexInfoRef.current) {
      // Potentially snap vertex to a grid or perform other actions on drag end
    }
    setDraggingVertexInfo(null); // Termina sempre il trascinamento
    // Potrebbe essere necessario ridisegnare se lo stato visivo dipende da draggingVertexInfo
    // draw(); // Se draw è una funzione useCallback che puoi chiamare qui
  }, []); // Aggiungere dipendenze se necessario (es. setDraggingVertexInfo)

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Gestisci solo click sinistro

    const naturalCoords = getNaturalCoordinates(e);
    if (!naturalCoords) return;

    if (isDrawing) {
      // Aggiungi punto al poligono corrente
      setCurrentPolygon(prev => [...prev, naturalCoords]);
    } else {
      // Logica per selezionare poligoni o vertici, o iniziare a disegnare un nuovo poligono
      // console.log("Canvas clicked at:", naturalCoords);
    }
    // draw(); // Potrebbe essere necessario ridisegnare
  }, [isDrawing, getNaturalCoordinates, setCurrentPolygon]); // Aggiungere dipendenze

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Impedisce il menu contestuale del browser
    // console.log("Canvas context menu triggered");
    // Qui potrebbe andare la logica per finire un poligono, eliminare un vertice, ecc.
    if (isDrawing && currentPolygonRef.current.length >= 3) {
      // Esempio: finisci il poligono con il tasto destro
      // handleFinishDrawing(); // Assicurati che handleFinishDrawing sia definito e useCallback
    }
  }, [isDrawing]); // Aggiungere dipendenze se necessario

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
      <div 
        className="flex-grow relative border rounded overflow-auto bg-gray-100 dark:bg-gray-900"
        // This outer div provides scrolling
      >
        {/* This inner div is positioned relatively and sized to the image's natural dimensions */}
        <div
          className="relative" // Ensures children with position:absolute are relative to this
          style={imageSize ? {
            width: `${imageSize.width}px`,
            height: `${imageSize.height}px`,
            margin: 'auto' // Centers the content if scroll container is larger
          } : {
            // Placeholder style if no image/imageSize yet
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}
        >
          {imageUrl ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Location background"
              onLoad={handleImageLoad}
              onError={() => {
                setImageSize(null); setImageUrl(null); /* Handle error */
              }}
              style={{
                display: 'block', // Initial display, controlled further in useEffect
                position: 'absolute', // Positioned within the sized inner div
                top: 0,
                left: 0,
                // width & height styles are set in useEffect based on natural dimensions
              }}
              // NO Tailwind size restricting classes like max-w-full, max-h-full, object-contain
            />
          ) : (
            <div className="text-gray-500 dark:text-gray-400">
              Please upload an image.
            </div>
          )}
          {/* Canvas for drawing, also positioned absolutely to overlay the image */}
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp} // Ensure this handler exists
            onMouseLeave={handleCanvasMouseLeave}
            onClick={handleCanvasClick} // Ensure this handler exists
            onContextMenu={handleCanvasContextMenu} // Ensure this handler exists
            style={{
              position: 'absolute', // Overlays the image
              top: 0,
              left: 0,
              // width & height styles AND attributes are set in useEffect
              cursor: isDrawing ? 'crosshair' : (draggingVertexInfo ? 'grabbing' : 'default'),
              // backgroundColor: 'rgba(0,255,0,0.1)' // For debugging canvas position
            }}
          />
        </div>
      </div>
    </div>
  );
};
