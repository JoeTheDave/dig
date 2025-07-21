import { useState } from 'react';

interface GameSetupProps {
  onGameCreated: (gameId: string) => void;
}

const DOG_ICONS = ['🐕', '🐶', '🦮', '🐕‍🦺', '🐩', '🌭'];

export default function GameSetup({ onGameCreated }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2']);
  const [playerIcons, setPlayerIcons] = useState([DOG_ICONS[0], DOG_ICONS[1]]);
  const [isCreating, setIsCreating] = useState(false);

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const names = Array(count).fill(0).map((_, i) => `Player ${i + 1}`);
    // Ensure unique icons for each player
    const icons = Array(count).fill(0).map((_, i) => DOG_ICONS[i]);
    setPlayerNames(names);
    setPlayerIcons(icons);
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleIconChange = (index: number, icon: string) => {
    // Check if icon is already used by another player
    const isUsedByOtherPlayer = playerIcons.some((usedIcon, usedIndex) => 
      usedIcon === icon && usedIndex !== index
    );
    
    if (isUsedByOtherPlayer) {
      return; // Don't allow duplicate selection
    }
    
    const newIcons = [...playerIcons];
    newIcons[index] = icon;
    setPlayerIcons(newIcons);
  };

  const handleCreateGame = async () => {
    if (playerNames.some(name => !name.trim())) {
      alert('Please enter names for all players');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerCount,
          playerNames: playerNames.map(name => name.trim()),
          playerIcons: playerIcons
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const { gameId } = await response.json();
      onGameCreated(gameId);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Setup New Game</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Players
        </label>
        <div className="flex gap-2">
          {[2, 3, 4].map(count => (
            <button
              key={count}
              onClick={() => handlePlayerCountChange(count)}
              className={`px-4 py-2 rounded ${
                playerCount === count
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {count} Players
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Player Setup
        </label>
        <div className="space-y-4">
          {playerNames.map((name, index) => (
            <div key={index} className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={`Player ${index + 1} name`}
                />
              </div>
              <div className="flex gap-2">
                {DOG_ICONS.map((icon) => {
                  const isUsedByOtherPlayer = playerIcons.some((usedIcon, usedIndex) => 
                    usedIcon === icon && usedIndex !== index
                  );
                  const isSelectedByCurrentPlayer = playerIcons[index] === icon;
                  
                  return (
                    <button
                      key={icon}
                      onClick={() => handleIconChange(index, icon)}
                      disabled={isUsedByOtherPlayer}
                      className={`w-12 h-12 text-2xl rounded-lg border-2 hover:bg-gray-100 transition-all ${
                        isSelectedByCurrentPlayer ? 'border-green-500 bg-green-50' : 
                        isUsedByOtherPlayer ? 'border-red-300 bg-red-50 opacity-50 cursor-not-allowed' :
                        'border-gray-300'
                      }`}
                      title={isUsedByOtherPlayer ? 'Already selected by another player' : ''}
                    >
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleCreateGame}
        disabled={isCreating}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? 'Creating Game...' : 'Start Game'}
      </button>
    </div>
  );
}