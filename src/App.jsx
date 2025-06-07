import React from 'react';
import CanvasScene from './components/CanvasScene';
import CharacterProfile from './components/CharacterProfile';
import './styles/ui.css';

function App() {
  return (
    <div className="app">
      <CanvasScene />
      <CharacterProfile />
    </div>
  );
}

export default App; 