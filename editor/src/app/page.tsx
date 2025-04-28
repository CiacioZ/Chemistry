import React from 'react';
import Link from 'next/link';

// Questa pagina ora è meno rilevante, potrebbe reindirizzare
// o semplicemente mostrare un link alla pagina principale dell'editor.
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-xl mb-4">Welcome</h1>
      <Link href="/entities">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Apri Editor Principale
        </button>
      </Link>
      {/* Potresti anche implementare un redirect automatico qui se preferisci */}
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