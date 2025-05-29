"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Arrows } from './components/Arrows';
import { DiagramNode } from './components/DiagramNode';
import { NodeDialog } from './components/NodeDialog';
import { Minimap } from './components/MiniMap';
import { DiagramToolbar } from './components/DiagramToolbar';
import { useDiagramContext } from './contexts/DiagramContext';
import { useDragAndDrop } from './hooks/useDragAndDrop';
import { useNodePositions } from './hooks/useNodePositions';
import { ConnectionDragState, Entity } from './types/index';
import { diagramOperations } from './services/diagramOperations';

const FlowDiagram: React.FC = () => {
  // Context
  const { nodes, pushNodes, entities, setEntities } = useDiagramContext();

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  // State
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [connectingNode, setConnectingNode] = useState<ConnectionDragState>({
    isConnecting: false,
    sourceNode: null,
    sourcePosition: null
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [viewportBounds, setViewportBounds] = useState({
    scrollLeft: 0,
    scrollTop: 0,
    width: 0,
    height: 0
  });

  // Custom hooks
  const {
    tempNodes,
    draggingNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCurrentNodes
  } = useDragAndDrop({
    nodes,
    workspaceRef,
    pushNodes
  });

  const nodePositions = useNodePositions(
    nodes,
    workspaceRef,
    tempNodes,
    draggingNode.isDragging
  );

  // Effect per aggiornare i bounds della viewport
  useEffect(() => {
    const updateViewportBounds = () => {
      if (scrollContainerRef.current) {
        setViewportBounds({
          scrollLeft: scrollContainerRef.current.scrollLeft,
          scrollTop: scrollContainerRef.current.scrollTop,
          width: scrollContainerRef.current.clientWidth,
          height: scrollContainerRef.current.clientHeight
        });
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateViewportBounds);
      window.addEventListener('resize', updateViewportBounds);
      updateViewportBounds();

      return () => {
        container.removeEventListener('scroll', updateViewportBounds);
        window.removeEventListener('resize', updateViewportBounds);
      };
    }
  }, []);

  // Connection handlers
  const startConnection = (nodeId: string, position: { x: number; y: number }) => {
    // Possiamo iniziare una connessione solo da un punto di output
    setConnectingNode({
      isConnecting: true,
      sourceNode: nodeId,
      sourcePosition: position
    });
    setMousePosition({ x: 0, y: 0 }); // Reset della posizione del mouse
  };

  const endConnection = (targetId: string) => {
    console.log(`[FlowDiagram] endConnection called. Target ID: ${targetId}, Source Node: ${connectingNode.sourceNode}`);

    if (connectingNode.sourceNode && 
        connectingNode.sourceNode !== targetId && 
        mousePosition.x !== 0 && 
        mousePosition.y !== 0) {
      
      const sourceNodeInstance = nodes.find(n => n.id === connectingNode.sourceNode);
      const targetNodeInstance = nodes.find(n => n.id === targetId);

      console.log("[FlowDiagram] Source Node instance:", JSON.parse(JSON.stringify(sourceNodeInstance)));
      console.log("[FlowDiagram] Target Node instance:", JSON.parse(JSON.stringify(targetNodeInstance)));

      // Condizione per prevenire la creazione di un edge duplicato IDENTICO
      // (stessa sorgente, stesso target)
      if (sourceNodeInstance && targetNodeInstance && 
          !sourceNodeInstance.connections.out.includes(targetId)) { // Verifica se 'out' della sorgente include già il target
        
        console.log(`[FlowDiagram] Creating new connection from ${connectingNode.sourceNode} to ${targetId}`);
        const newNodes = diagramOperations.createConnection(
          nodes, // Passa lo stato corrente dei nodi
          connectingNode.sourceNode,
          targetId
        );
        pushNodes(newNodes);
      } else {
        if (!sourceNodeInstance || !targetNodeInstance) {
          console.warn("[FlowDiagram] Skipping connection: Source or Target node not found.");
        } else {
          console.log(`[FlowDiagram] Skipping connection: Connection from ${connectingNode.sourceNode} to ${targetId} already exists or invalid.`);
        }
      }
    } else {
      console.log("[FlowDiagram] endConnection: Conditions not met to create connection (source/target same, mouse position zero, etc).");
    }
    
    // Reset degli stati
    setConnectingNode({
      isConnecting: false,
      sourceNode: null,
      sourcePosition: null
    });
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div className="p-4 h-[calc(100vh-120px)]">
      <DiagramToolbar scrollContainerRef={scrollContainerRef} />

      <div ref={scrollContainerRef} className="overflow-auto h-full border border-gray-200 rounded-lg">
        <div 
          ref={workspaceRef}
          className="relative w-[3000px] h-[2000px] p-4"
          onMouseMove={(e) => {
            handleMouseMove(e);
            if (connectingNode.isConnecting) {
              setMousePosition({ x: e.clientX, y: e.clientY });
            }
          }}
          onMouseUp={handleMouseUp}
        >
          <Arrows 
            nodes={getCurrentNodes()}
            positions={nodePositions}
            pushNodes={pushNodes}
          />

          {/* Linea di connessione temporanea */}
          {connectingNode.isConnecting && connectingNode.sourcePosition && mousePosition.x !== 0 && mousePosition.y !== 0 && (
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <path
                d={`M ${connectingNode.sourcePosition.x - workspaceRef.current?.getBoundingClientRect().left} 
                    ${connectingNode.sourcePosition.y - workspaceRef.current?.getBoundingClientRect().top} 
                   Q ${(connectingNode.sourcePosition.x + mousePosition.x) / 2} 
                    ${connectingNode.sourcePosition.y - workspaceRef.current?.getBoundingClientRect().top},
                   ${mousePosition.x - workspaceRef.current?.getBoundingClientRect().left} 
                    ${mousePosition.y - workspaceRef.current?.getBoundingClientRect().top}`}
                stroke="#666"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
              />
            </svg>
          )}

          {/* Nodi del diagramma */}
          {getCurrentNodes().map(node => (
            <DiagramNode
              key={node.id}
              node={node}
              entities={entities}
              onMouseDown={handleMouseDown}
              onEdit={setEditingNode}
              onDelete={(id) => pushNodes(diagramOperations.deleteNode(nodes, id))}
              onStartConnection={startConnection}
              onEndConnection={endConnection}
              isConnecting={connectingNode.isConnecting}
            />
          ))}
        </div>
      </div>

      {/* Dialog per la modifica dei nodi */}
      <NodeDialog
        node={nodes.find(n => n.id === editingNode) || null}
        open={editingNode !== null}
        onOpenChange={(open) => !open && setEditingNode(null)}
        onUpdate={(id, updates) => pushNodes(diagramOperations.updateNode(nodes, id, updates))}
        entities={entities}          
        setEntities={setEntities}    
      />

      {/* Minimap per la navigazione */}
      <Minimap
        nodes={getCurrentNodes()}
        viewportBounds={viewportBounds}
        containerWidth={3000}
        containerHeight={2000}
        onViewportChange={(scrollLeft, scrollTop) => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
              left: scrollLeft,
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }}
      />
    </div>
  );
};

export default FlowDiagram;