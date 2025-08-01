"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { DiagramProvider, useDiagramContext } from '../components/flow-diagram/contexts/DiagramContext';
import { loadDiagram } from '../components/flow-diagram/utils/saveLoad';
import { PREDEFINED_ENTITIES } from '../components/flow-diagram/types/index';

const Landing: React.FC = () => {
  const router = useRouter();
  const { pushNodes, setProjectName, setEntities } = useDiagramContext();

  // Nuovo progetto
  const handleNewProject = () => {
    pushNodes([]);
    setProjectName('Nuovo Progetto');
    setEntities(PREDEFINED_ENTITIES);
    router.push('/editor');
  };

  // Carica progetto
  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadDiagram(
      file,
      (loadedNodes, loadedProjectName, loadedEntities) => {
        pushNodes(loadedNodes);
        setProjectName(loadedProjectName);
        setEntities(loadedEntities);
        router.push('/editor');
      },
      (error) => {
        alert('Errore nel caricamento del progetto: ' + error);
      }
    );
    event.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700 dark:text-indigo-300">Benvenuto in Chemistry Editor</h1>
        <p className="mb-8 text-gray-600 dark:text-gray-300 text-center max-w-md">Crea un nuovo progetto o caricane uno esistente per iniziare a lavorare con l'editor visuale.</p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={handleNewProject}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold text-lg shadow hover:bg-indigo-700 transition"
          >
            + Nuovo progetto
          </button>
          <label className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold text-lg shadow hover:bg-blue-600 transition text-center cursor-pointer">
            Carica progetto
            <input type="file" accept=".json" onChange={handleLoadProject} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};

// Rimuovo il DiagramProvider locale, esporto direttamente Landing
export default Landing;