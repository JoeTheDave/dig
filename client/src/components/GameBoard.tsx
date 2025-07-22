import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface GameState {
  id: string;
  status: string;
  currentTurn: number;
  actionsThisTurn: number;
  playerCount: number;
  bowlValues: Record<string, number>;
  players: Array<{
    id: string;
    name: string;
    icon: string;
    position: number;
    yardPosition: number;
    score: number;
    bonesInHand: Array<{
      id: string;
      color: string;
      uncertainColor: string;
      revealed: boolean;
    }>;
    buriedBones: Array<{
      id: string;
      color: string;
      currentValue: number;
    }>;
  }>;
  bones: Array<{
    id: string;
    color: string;
    uncertainColor: string;
    position: number | null;
    inBowl: boolean;
    revealed: boolean;
    buriedByPlayerId?: string;
  }>;
  bowls: Array<{
    id: string;
    color: string;
    position: number;
    value: number;
  }>;
  yardCards: Array<{
    id: string;
    position: number;
    type: string;
    color: string | null;
  }>;
}

interface GameBoardProps {
  gameId: string;
}

const COLOR_STYLES: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500'
};

export default function GameBoard({ gameId }: GameBoardProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDigReplaceModal, setShowDigReplaceModal] = useState(false);
  const [dugBone, setDugBone] = useState<any>(null);
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set());
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
  const [locallyRevealedBones, setLocallyRevealedBones] = useState<Set<string>>(new Set());
  const [movingCards, setMovingCards] = useState<Set<string>>(new Set());
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [previousTurn, setPreviousTurn] = useState<number | null>(null);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [gameId]);

  const fetchGameState = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch game state');
      }
      const game = await response.json();
      
      // Check for turn change
      if (previousTurn !== null && previousTurn !== game.currentTurn && game.status === 'playing') {
        setShowTurnTransition(true);
        setTimeout(() => setShowTurnTransition(false), 2000);
      }
      setPreviousTurn(game.currentTurn);
      
      setGameState(game);
      // Clear locally revealed bones only for bones that are now revealed in the server state
      setLocallyRevealedBones(prev => {
        const newSet = new Set(prev);
        // Remove bones that are now revealed on the server
        game.bones.forEach((bone: any) => {
          if (bone.revealed) {
            newSet.delete(bone.id);
          }
        });
        return newSet;
      });
      setMovingCards(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  const handleMoveToPosition = async (targetCardId: string) => {
    if (!gameState || !currentPlayer) return;
    
    // Find the target card
    const targetCard = gameState.yardCards.find(card => card.id === targetCardId);
    if (!targetCard) return;
    
    // Sort cards by their actual positions to get visual order
    const sortedCards = [...gameState.yardCards].sort((a, b) => a.position - b.position);
    
    // Find visual indices
    const currentPlayerVisualIndex = sortedCards.findIndex(card => card.position === currentPlayer.yardPosition);
    const targetCardVisualIndex = sortedCards.findIndex(card => card.id === targetCardId);
    
    if (currentPlayerVisualIndex === -1 || targetCardVisualIndex === -1) {
      toast.error('Invalid move positions');
      return;
    }
    
    // Calculate movement based on visual positions
    const spaces = targetCardVisualIndex - currentPlayerVisualIndex;
    
    try {
      const response = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentPlayer.id, 
          spaces: spaces
        })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Move failed');
      }
      
      await fetchGameState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Move failed');
    }
  };

  const handleDig = async () => {
    if (!gameState || !currentPlayer) return;
    
    // Find the bone at current position
    const boneCard = gameState.yardCards.find(card => 
      card.type === 'bone' && card.position === currentPlayer.yardPosition
    );
    
    if (!boneCard) {
      toast.error('No bone at current position');
      return;
    }
    
    const bone = gameState.bones.find(b => b.position === currentPlayer.yardPosition);
    if (!bone) {
      toast.error('Bone not found');
      return;
    }
    
    // Immediately reveal the bone locally
    setLocallyRevealedBones(prev => new Set([...prev, bone.id]));
    setDugBone(bone);
    
    // Start flip animation
    setFlippingCards(prev => new Set([...prev, boneCard.id]));
    
    // After flip animation, show replacement options
    setTimeout(() => {
      setFlippingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(boneCard.id);
        return newSet;
      });
      setShowDigReplaceModal(true);
    }, 600);
  };

  const handleDigReplace = async (replacementBoneId?: string) => {
    if (!gameState || !currentPlayer || !dugBone) return;
    
    // Start animating the bone to hand if taking it
    const boneCard = gameState.yardCards.find(card => 
      card.type === 'bone' && card.position === currentPlayer.yardPosition
    );
    
    if (boneCard && replacementBoneId !== 'PUT_BACK') {
      setAnimatingCards(prev => new Set([...prev, boneCard.id]));
    }
    
    // If no replacement bone and not putting back, animate leftmost card movement
    if (!replacementBoneId) {
      const leftmostCards = gameState.yardCards.filter(card => card.position < currentPlayer.yardPosition);
      if (leftmostCards.length > 0) {
        const leftmostCard = leftmostCards.reduce((leftmost, card) => 
          card.position < leftmost.position ? card : leftmost
        );
        setMovingCards(prev => new Set([...prev, leftmostCard.id]));
      }
    }
    
    try {
      const response = await fetch(`/api/games/${gameId}/dig`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          playerId: currentPlayer.id,
          replacementBoneId 
        })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Dig failed');
      }
      
      // Wait for animations to complete
      const animationDelay = 500;
      setTimeout(() => {
        setAnimatingCards(prev => {
          const newSet = new Set(prev);
          if (boneCard) newSet.delete(boneCard.id);
          return newSet;
        });
        setMovingCards(new Set());
        setShowDigReplaceModal(false);
        setDugBone(null);
        fetchGameState();
      }, animationDelay);
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dig failed');
      // Clean up state on error
      setAnimatingCards(prev => {
        const newSet = new Set(prev);
        if (boneCard) newSet.delete(boneCard.id);
        return newSet;
      });
      setMovingCards(new Set());
    }
  };


  const handleDropAllBones = async (color: string) => {
    if (!gameState || !currentPlayer) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}/drop-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentPlayer.id, color })
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Drop failed');
      }
      
      await fetchGameState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Drop failed');
    }
  };

  const handleEndTurn = async () => {
    if (!gameState) return;
    
    try {
      const response = await fetch(`/api/games/${gameId}/end-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'End turn failed');
      }
      
      await fetchGameState();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'End turn failed');
    }
  };

  if (loading) return <div className="text-center py-8">Loading game...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Error: {error}</div>;
  if (!gameState) return <div className="text-center py-8">Game not found</div>;

  const currentPlayer = gameState.players[gameState.currentTurn];

  return (
    <div className="bg-white rounded-lg shadow-md p-6" style={{ minWidth: '1200px' }}>
      <style>{`
        @keyframes flip {
          0% { transform: rotateY(0deg); }
          50% { transform: rotateY(90deg); }
          100% { transform: rotateY(0deg); }
        }
        @keyframes moveToHand {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          50% { transform: translateY(-50px) scale(1.2); opacity: 1; }
          100% { transform: translateY(120px) scale(0.6) translateX(200px); opacity: 0; }
        }
        @keyframes slideToPosition {
          0% { transform: translateX(0); }
          100% { transform: translateX(var(--target-x)); }
        }
        @keyframes droppablePulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes turnFadeIn {
          0% { opacity: 0; transform: scale(0.8); }
          20% { opacity: 1; transform: scale(1.1); }
          80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes moveableGlow {
          0% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 16px rgba(255, 215, 0, 0.3); }
          50% { box-shadow: 0 0 12px rgba(255, 215, 0, 0.8), 0 0 24px rgba(255, 215, 0, 0.4); }
          100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.6), 0 0 16px rgba(255, 215, 0, 0.3); }
        }
      `}</style>


      {/* Game Board - All elements in one absolute container */}
      <div className="mb-6">
        <div className="relative w-full" style={{ height: '500px', width: '1200px' }}>
          {/* Cards */}
          {gameState.yardCards.map((card) => {
            // Calculate visual positions for movement validation
            const sortedCards = [...gameState.yardCards].sort((a, b) => a.position - b.position);
            const currentPlayerVisualIndex = currentPlayer ? sortedCards.findIndex(c => c.position === currentPlayer.yardPosition) : -1;
            const cardVisualIndex = sortedCards.findIndex(c => c.id === card.id);
            const visualDistance = Math.abs(cardVisualIndex - currentPlayerVisualIndex);
            
            const canMoveHere = gameState.status === 'playing' && 
              currentPlayer && 
              gameState.actionsThisTurn < 3 &&
              visualDistance <= (4 - currentPlayer.bonesInHand.length) &&
              cardVisualIndex !== currentPlayerVisualIndex;
            
            const isFlipping = flippingCards.has(card.id);
            const isAnimating = animatingCards.has(card.id);
            const isMoving = movingCards.has(card.id);
            
            // Calculate target position for moving cards
            let targetX = 0;
            if (isMoving && currentPlayer) {
              targetX = (currentPlayer.yardPosition - card.position) * 52;
            }
            
            return (
              <div
                key={card.id}
                onClick={canMoveHere ? () => handleMoveToPosition(card.id) : undefined}
                className={`
                  absolute w-12 h-60 border-2 rounded flex flex-col items-center justify-center text-xs cursor-pointer
                  transition-all duration-300 ease-in-out
                  ${card.type === 'doghouse' ? 'bg-yellow-200 border-yellow-400' : ''}
                  ${card.type === 'bowl' ? COLOR_STYLES[card.color || ''] + ' border-gray-400' : ''}
                  ${card.type === 'bone' ? 'bg-gray-400 border-gray-600' : ''}
                  ${canMoveHere ? 'border-yellow-400 border-3 hover:scale-105' : 'border-gray-300'}
                  ${isAnimating ? 'z-10 animate-pulse' : ''}
                  ${isMoving ? 'z-10' : ''}
                `}
                style={{
                  left: `${card.position * 52}px`,
                  top: '0px',
                  '--target-x': `${targetX}px`,
                  transform: isFlipping ? 'rotateY(180deg)' : isAnimating ? `translateY(120px) scale(0.6) translateX(${200 + (gameState.currentTurn * 250) - (card.position * 52)}px)` : 'none',
                  animation: isFlipping ? 'flip 0.6s ease-in-out' : isAnimating ? 'moveToHand 0.5s ease-in-out forwards' : isMoving ? 'slideToPosition 0.5s ease-in-out forwards' : canMoveHere ? 'moveableGlow 2s ease-in-out infinite' : 'none'
                } as React.CSSProperties}
              >
                {card.type === 'doghouse' && <div className="text-3xl">🏠</div>}
                {card.type === 'bowl' && <div className="text-3xl">🥣</div>}
                {card.type === 'bone' && (
                  <div className="flex flex-col items-center">
                    <div className="text-xl text-white">🦴</div>
                    {(() => {
                      const bone = gameState.bones.find(b => b.position === card.position);
                      if (bone) {
                        const isRevealed = bone.revealed || locallyRevealedBones.has(bone.id);
                        if (isRevealed) {
                          return (
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded ${COLOR_STYLES[bone.color]} border border-white mt-1`} />
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex flex-col items-center">
                              <div className="flex gap-1 mt-1">
                                <div className={`w-2 h-2 rounded ${COLOR_STYLES[bone.color]} border border-white`} />
                                <div className={`w-2 h-2 rounded ${COLOR_STYLES[bone.uncertainColor]} border border-white`} />
                              </div>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            );
          })}

          {/* Player Icons */}
          {gameState.players.map((player) => (
            <div
              key={`player-icon-${player.id}`}
              className={`absolute text-2xl transition-all duration-500 ${
                player.id === currentPlayer?.id ? 'animate-bounce' : ''
              }`}
              style={{
                left: `${player.yardPosition * 52 + 24}px`,
                top: '270px',
                transform: 'translateX(-50%)'
              }}
              title={player.name}
            >
              {player.icon}
            </div>
          ))}

          {/* Player Hand Areas */}
          {gameState.players.map((player, playerIndex) => (
            <div
              key={`player-hand-${player.id}`}
              className={`absolute p-3 rounded border-2 bg-white shadow-lg transition-all duration-300 ${
                playerIndex === gameState.currentTurn ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
              style={{
                left: `${200 + playerIndex * 250}px`,
                top: '320px',
                width: '230px'
              }}
            >
              <div className="font-semibold text-sm">{player.name}</div>
              <div className="text-xs text-gray-600">Score: {player.score}</div>
              {playerIndex === gameState.currentTurn && (
                <div className="text-xs text-green-600 font-semibold">
                  Actions: {gameState.actionsThisTurn}/3
                </div>
              )}
              <div className="text-xs text-gray-600 mb-2">
                Bones in hand: {player.bonesInHand.length}/3
              </div>
              {player.bonesInHand.length > 0 && (
                <div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {player.bonesInHand.map(bone => {
                      // Check if this bone can be dropped (player is on matching bowl)
                      const canDrop = playerIndex === gameState.currentTurn && 
                        gameState.actionsThisTurn < 3 &&
                        gameState.yardCards.some(card => 
                          card.type === 'bowl' && 
                          card.position === currentPlayer?.yardPosition && 
                          card.color === bone.color
                        );
                      
                      return (
                        <div
                          key={bone.id}
                          className={`w-6 h-6 rounded ${COLOR_STYLES[bone.color]} border border-gray-300 flex items-center justify-center text-xs text-white font-bold ${
                            canDrop ? 'animate-pulse' : ''
                          }`}
                          style={{
                            animation: canDrop ? 'droppablePulse 1s infinite' : 'none'
                          }}
                          title={`${bone.color} bone${bone.revealed ? ' (revealed)' : ` or ${bone.uncertainColor}?`}${canDrop ? ' - Can drop!' : ''}`}
                        >
                          {bone.revealed ? bone.color[0].toUpperCase() : '?'}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Drop button for matching bones */}
                  {(() => {
                    if (playerIndex !== gameState.currentTurn || gameState.actionsThisTurn >= 3) return null;
                    
                    // Find bones that can be dropped
                    const droppableBones = player.bonesInHand.filter(bone => 
                      gameState.yardCards.some(card => 
                        card.type === 'bowl' && 
                        card.position === currentPlayer?.yardPosition && 
                        card.color === bone.color
                      )
                    );
                    
                    if (droppableBones.length === 0) return null;
                    
                    return (
                      <button
                        onClick={() => handleDropAllBones(droppableBones[0].color)}
                        className={`px-2 py-1 text-xs text-white rounded hover:opacity-80 ${COLOR_STYLES[droppableBones[0].color]}`}
                      >
                        Drop {droppableBones.length} {droppableBones[0].color} bone{droppableBones.length > 1 ? 's' : ''}
                      </button>
                    );
                  })()}
                </div>
              )}
              
              {/* Buried Bones Section */}
              {(() => {
                if (player.buriedBones.length === 0) return null;
                
                return (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="text-xs text-gray-600 mb-1">Buried Bones:</div>
                    <div className="flex gap-1 flex-wrap">
                      {player.buriedBones.map(bone => (
                        <div
                          key={bone.id}
                          className={`w-6 h-6 rounded ${COLOR_STYLES[bone.color]} border border-gray-300 opacity-60 flex items-center justify-center text-xs text-white font-bold relative`}
                          title={`${bone.color} bone - ${bone.currentValue} point${bone.currentValue !== 1 ? 's' : ''}`}
                        >
                          {bone.currentValue}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      </div>


      {/* Game Actions */}
      {gameState.status === 'playing' && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Actions for {currentPlayer?.name}</h3>
          <p className="text-sm text-gray-600 mb-3">
            {gameState.actionsThisTurn >= 3 ? 
              "Turn will end automatically after 3 actions" : 
              `Click on highlighted cards to move, or use actions below (${3 - gameState.actionsThisTurn} remaining)`
            }
          </p>
          
          {/* Dig Action */}
          <div className="mb-4">
            <button
              onClick={handleDig}
              disabled={
                gameState.actionsThisTurn >= 3 ||
                (currentPlayer?.bonesInHand.length || 0) >= 3
              }
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dig Bone {(currentPlayer?.bonesInHand.length || 0) >= 3 && "(Hand Full)"}
              {gameState.actionsThisTurn >= 3 && " (No Actions Left)"}
            </button>
          </div>


          {/* End Turn */}
          <div className="mb-4">
            <button
              onClick={handleEndTurn}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              End Turn Early
            </button>
          </div>
        </div>
      )}

      {gameState.status === 'finished' && (
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3 text-green-600">🎉 Game Finished!</h3>
          <div className="space-y-2">
            {gameState.players
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div key={player.id} className={`p-2 rounded ${index === 0 ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-100'}`}>
                  <span className="font-semibold">
                    {index === 0 ? '👑 ' : `${index + 1}. `}
                    {player.name}
                  </span>
                  <span className="ml-2 text-gray-600">{player.score} points</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Dig and Replace Modal */}
      {showDigReplaceModal && dugBone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Bone Revealed!</h3>
            <div className="mb-4">
              <p className="text-gray-600 mb-2">You dug up a bone. It's actually:</p>
              <div className={`w-12 h-12 rounded-full ${COLOR_STYLES[dugBone.color]} border-2 border-gray-300 mx-auto mb-4`}></div>
              <p className="text-center font-semibold">{dugBone.color.toUpperCase()}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Choose what to do with this bone:
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDigReplace()}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Take This Bone
              </button>
              
              {currentPlayer && currentPlayer.bonesInHand.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Or replace with bone from hand:</p>
                  <div className="flex gap-2 mb-4">
                    {currentPlayer.bonesInHand.map(bone => (
                      <button
                        key={bone.id}
                        onClick={() => handleDigReplace(bone.id)}
                        className={`px-3 py-2 text-white rounded hover:opacity-80 flex flex-col items-center ${COLOR_STYLES[bone.color]}`}
                      >
                        <div>{bone.revealed ? bone.color : '?'}</div>
                        {!bone.revealed && (
                          <div className="text-xs">or {bone.uncertainColor}?</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => handleDigReplace('PUT_BACK')}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Put Back (Don't Take)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turn Transition Overlay */}
      {showTurnTransition && currentPlayer && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="bg-green-600 text-white px-8 py-4 rounded-lg shadow-lg text-xl font-bold"
            style={{
              animation: 'turnFadeIn 2s ease-in-out forwards'
            }}
          >
            {currentPlayer.icon} {currentPlayer.name}'s Turn!
          </div>
        </div>
      )}
    </div>
  );
}