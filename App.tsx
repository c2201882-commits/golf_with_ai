import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Layout } from './components/Layout';
import { BagSelection } from './components/BagSelection';
import { HoleSetup } from './components/HoleSetup';
import { PlayHole } from './components/PlayHole';
import { Analysis } from './components/Analysis';
import { PastGames } from './components/PastGames';
import { Social } from './components/Social';
import { Home } from './components/Home';

const Main: React.FC = () => {
  const { state } = useGame();

  const renderView = () => {
    switch (state.view) {
      case 'HOME':
        return <Home />;
      case 'BAG_SETUP':
        return <BagSelection />;
      case 'HOLE_SETUP':
        return <HoleSetup />;
      case 'PLAY':
        return <PlayHole />;
      case 'ANALYSIS':
        return <Analysis />;
      case 'PAST_GAMES':
        return <PastGames />;
      case 'SOCIAL':
        return <Social />;
      default:
        return <Home />;
    }
  };

  return (
    <Layout>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <Main />
    </GameProvider>
  );
};

export default App;