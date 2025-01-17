import { useState } from 'react';

export function useHistory<T>(initialState: T) {
  // La nostra "pila" di stati passati
  const [history, setHistory] = useState<T[]>([initialState]);
  // L'indice che indica la nostra posizione attuale nella storia
  const [currentIndex, setCurrentIndex] = useState(0);

  // Funzione per aggiungere un nuovo stato alla storia
  const pushState = (newState: T) => {
    // Rimuoviamo tutti gli stati "futuri" se stavamo nel mezzo della storia
    const newHistory = history.slice(0, currentIndex + 1);
    // Aggiungiamo il nuovo stato
    newHistory.push(newState);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  // Funzione per tornare indietro nella storia
  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      return history[currentIndex - 1];
    }
    return history[currentIndex];
  };

  // Funzione per andare avanti nella storia
  const redo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      return history[currentIndex + 1];
    }
    return history[currentIndex];
  };

  // Funzione per verificare se possiamo fare undo/redo
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    state: history[currentIndex],
    pushState,
    undo,
    redo,
    canUndo,
    canRedo
  };
}