import React from 'react';
import { DiagramProvider } from '../components/flow-diagram/contexts/DiagramContext';
import FlowDiagram from '../components/flow-diagram/FlowDiagram';

const App = () => {
  return (
    <DiagramProvider>
      <FlowDiagram />
    </DiagramProvider>
  );
};

export default App;