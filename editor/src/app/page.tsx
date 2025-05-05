"use client"; // Aggiunto per usare hooks

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importato useRouter
import { useDiagramContext } from '../components/flow-diagram/contexts/DiagramContext'; // Importato useDiagramContext
import { loadDiagram } from '../components/flow-diagram/utils/saveLoad'; // Importato loadDiagram

// Questa pagina ora serve come punto di ingresso per creare o caricare progetti.
export default function HomePage() {
  const router = useRouter(); // Hook per la navigazione
  const { pushNodes, setProjectName, setEntities } = useDiagramContext(); // Ottieni funzioni dal context

  // Funzione per gestire il caricamento del file
  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    loadDiagram(
      file,
      (loadedNodes, loadedProjectName, loadedEntities) => {
        // Aggiorna lo stato globale con i dati caricati
        pushNodes(loadedNodes);
        setProjectName(loadedProjectName);
        setEntities(loadedEntities);
        // Reindirizza all'editor dopo il caricamento
        router.push('/entities');
      },
      (error) => {
        // Mostra un messaggio di errore se il caricamento fallisce
        alert('Errore nel caricamento del progetto: ' + error);
      }
    );

    // Resetta il valore dell'input per permettere di caricare lo stesso file di nuovo
    event.target.value = '';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
      <h1 className="text-xl mb-4">Gestione Progetti</h1>
      {/* Bottone "Crea nuovo progetto" rimane un Link */}
      <Link href="/entities">
        <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-48">
          Crea nuovo progetto
        </button>
      </Link>
      {/* Bottone "Carica progetto" modificato */}
      <label className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-48 cursor-pointer text-center">
        Carica progetto
        <input
          type="file"
          accept=".json" // Accetta solo file .json
          onChange={handleLoadProject}
          className="hidden" // Nasconde l'input file standard
        />
      </label>
    </div>
  );
}

// Rimuovi tutto il codice sottostante che definiva il vecchio componente 'App'
// import { DiagramProvider } from '../components/flow-diagram/contexts/DiagramContext';
// import FlowDiagram from '../components/flow-diagram/FlowDiagram';
//
// const App = () => {
//   return (
//     // Contenitore principale per layout
//     <div className="relative min-h-screen">
//        {/* Bottone per andare all'editor posizionato in alto a destra */}
//        <div className="absolute top-4 right-4 z-20">
//          <Link href="/entities">
//            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow">
//              Vai all'Editor Entità
//            </button>
//          </Link>
//        </div>
//
//        {/* Contenuto originale del diagramma */}
//        <DiagramProvider>
//          <FlowDiagram />
//        </DiagramProvider>
//     </div>
//   );
// };
//
// export default App; // Rimosso questo secondo export default