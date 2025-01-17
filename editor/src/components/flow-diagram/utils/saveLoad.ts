// src/components/flow-diagram/utils/saveLoad.ts
import { Node, Entity, PREDEFINED_ENTITIES } from '../types';

interface DiagramData {
  version: string;
  projectName: string;
  nodes: Node[];
  entities: Entity[];
}

export const saveDiagram = (nodes: Node[], projectName: string, entities: Entity[]) => {
    const diagramData = {
        version: "1.0",
        projectName,
        nodes,
        entities
      };
    
      const jsonContent = JSON.stringify(diagramData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

  export const loadDiagram = (
      file: File,
      onSuccess: (nodes: Node[], projectName: string, entities: Entity[]) => void,
      onError: (error: string) => void
    ) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content) as DiagramData;
          onSuccess(data.nodes, data.projectName, data.entities || PREDEFINED_ENTITIES);
        } catch (error) {
          onError(error instanceof Error ? error.message : 'Errore nel caricamento del file');
        }
      };
      reader.readAsText(file);
    };
    