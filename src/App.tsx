import { useGameState } from './hooks/useGameState';
import { EndScreen } from './screens/EndScreen';
import { GameScreen } from './screens/GameScreen';
import { StartScreen } from './screens/StartScreen';

function App() {
  const { state, startGame, chooseAction, resetGame } = useGameState();

  if (state.phase === 'start') {
    return <StartScreen onStart={startGame} />;
  }

  if (state.phase === 'end') {
    return <EndScreen state={state} onRestart={resetGame} />;
  }

  return <GameScreen state={state} onAction={chooseAction} />;
}

export default App;
