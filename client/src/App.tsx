import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import GameSetup from './components/GameSetup'
import GameBoard from './components/GameBoard'

function App() {
  const [gameId, setGameId] = useState<string | null>(null);

  const handleGameCreated = (newGameId: string) => {
    setGameId(newGameId);
  };

  const handleBackToSetup = () => {
    setGameId(null);
  };

  return (
    <div className="min-h-screen bg-green-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-green-800 mb-2">🐕 DIG 🦴</h1>
          <p className="text-lg text-green-700">Online Board Game</p>
          {gameId && (
            <button
              onClick={handleBackToSetup}
              className="mt-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Back to Setup
            </button>
          )}
        </header>

        <div className="max-w-none mx-auto px-4">
          {!gameId ? (
            <GameSetup onGameCreated={handleGameCreated} />
          ) : (
            <GameBoard gameId={gameId} />
          )}
        </div>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  )
}

export default App