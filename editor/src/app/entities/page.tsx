'use client';

import React, { useState } from 'react';
import EditorTabs, { EditorTabType } from '@/components/entity-editor/EntityTabs';
import FlowDiagram from '@/components/flow-diagram/FlowDiagram';

import { LocationEditor } from '@/components/entity-editor/LocationEditor'; 
import { ItemEditor } from '@/components/entity-editor/ItemEditor'; 
import { CharacterEditor } from '@/components/entity-editor/CharacterEditor'; 

const editorTabs: EditorTabType[] = ['Graph', 'Locations', 'Items', 'Characters'];

export default function EditorPage() {
  const [currentTab, setCurrentTab] = useState<EditorTabType>('Graph');

  const renderEditorContent = () => {
    switch (currentTab) {
      case 'Graph':
        return (
          <div className="w-full h-[calc(100vh-150px)]">
             <FlowDiagram />
          </div>
        );
      case 'Locations':
        return <LocationEditor />;
      case 'Items':
        return <ItemEditor />;        
      case 'Characters':
        return <CharacterEditor />;       
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Chemistry Editor</h1>
      <EditorTabs
         tabs={editorTabs}
         onTabChange={setCurrentTab}
         initialTab={currentTab}
      />
      <div className="flex-grow mt-4 overflow-auto">
        {renderEditorContent()}
      </div>
    </div>
  );
}