import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Node } from '../types';
import { ConnectionPoint } from './ConnectionPoint';

interface DiagramNodeProps {
  node: Node;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartConnection: (nodeId: string, position: { x: number; y: number }) => void;
  onEndConnection: (targetId: string) => void;
  isConnecting: boolean;
}

export const DiagramNode: React.FC<DiagramNodeProps> = ({
  node,
  onMouseDown,
  onEdit,
  onDelete,
  onStartConnection,
  onEndConnection,
  isConnecting
}) => {
  const renderActionContent = (node: Node) => {
    if (node.type !== 'action') return null;
    
    return (
      <div className="space-y-1 text-sm">
        {node.from && (
          <div className="flex">
            <span className="font-medium w-16 text-gray-500">From:</span>
            <span className="text-gray-700">{node.from}</span>
          </div>
        )}
        {node.verb && (
          <div className="flex">
            <span className="font-medium w-16 text-gray-500">Verb:</span>
            <span className="text-gray-700">{node.verb}</span>
          </div>
        )}
        {node.to && (
          <div className="flex">
            <span className="font-medium w-16 text-gray-500">To:</span>
            <span className="text-gray-700">{node.to}</span>
          </div>
        )}
        {node.with && (
          <div className="flex">
            <span className="font-medium w-16 text-gray-500">With:</span>
            <span className="text-gray-700">{node.with}</span>
          </div>
        )}
        {node.where && (
          <div className="flex">
            <span className="font-medium w-16 text-gray-500">Where:</span>
            <span className="text-gray-700">{node.where}</span>
          </div>
        )}
      </div>
    );
  };

  const renderStateContent = (node: Node) => {
    if (node.type !== 'state') return null;
    
    return (
      <span className="text-sm text-gray-600">
        {node.description || 'State'}
      </span>
    );
  };

  return (
    <div
      id={node.id}
      className={`absolute rounded-lg border-2 cursor-move select-none
        ${node.type === 'action' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}
      style={{
        left: `${node.position.left}px`,
        top: `${node.position.top}px`,
        minWidth: '200px'
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white bg-opacity-50">
        <span className="font-medium text-gray-700">
          {node.label}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(node.id)}
            className="p-1 hover:text-blue-500"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(node.id)}
            className="p-1 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {node.type === 'action' ? renderActionContent(node) : renderStateContent(node)}
      </div>

      {/* Connection Points */}
      <ConnectionPoint
        nodeId={node.id}
        onStartConnection={onStartConnection}
        onEndConnection={onEndConnection}
        isConnecting={isConnecting}
        position="right"
        canConnect={!isConnecting} // il punto di output può essere usato solo per iniziare una connessione
    />
    <ConnectionPoint
        nodeId={node.id}
        onStartConnection={onStartConnection}
        onEndConnection={onEndConnection}
        isConnecting={isConnecting}
        position="left"
        canConnect={isConnecting} // il punto di input può essere usato solo per ricevere una connessione
    />
    </div>
  );
};