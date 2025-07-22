import { prisma } from './db';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const BONES_PER_COLOR = 4;

export interface GameSetup {
  playerCount: number;
  playerNames: string[];
  playerIcons: string[];
}

export async function createGame(setup: GameSetup): Promise<string> {
  if (setup.playerCount < 2 || setup.playerCount > 4) {
    throw new Error('Game requires 2-4 players');
  }

  if (setup.playerNames.length !== setup.playerCount || setup.playerIcons.length !== setup.playerCount) {
    throw new Error('Player names and icons count must match player count');
  }

  const game = await prisma.game.create({
    data: {
      playerCount: setup.playerCount,
      status: 'waiting'
    }
  });

  // Create players - they will start at dog house position after yard is initialized
  for (let i = 0; i < setup.playerCount; i++) {
    await prisma.player.create({
      data: {
        gameId: game.id,
        name: setup.playerNames[i],
        icon: setup.playerIcons[i],
        position: i,
        yardPosition: 25, // Dog house position (20 bones + 5 bowls)
        score: 0
      }
    });
  }

  // Create bones (4 of each color, total 20 bones) with uncertain colors
  const allUncertainColors: string[] = [];
  
  // Generate balanced uncertain colors (each color appears equally on uncertain side)
  for (let i = 0; i < 4; i++) {
    allUncertainColors.push(...COLORS);
  }
  
  // Shuffle uncertain colors
  for (let i = allUncertainColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allUncertainColors[i], allUncertainColors[j]] = [allUncertainColors[j], allUncertainColors[i]];
  }
  
  let uncertainIndex = 0;
  
  for (const color of COLORS) {
    for (let i = 0; i < BONES_PER_COLOR; i++) {
      let uncertainColor = allUncertainColors[uncertainIndex++];
      
      // Ensure uncertain color is different from actual color
      if (uncertainColor === color) {
        // Find a different color
        uncertainColor = COLORS.find(c => c !== color) || COLORS[0];
      }
      
      await prisma.bone.create({
        data: {
          gameId: game.id,
          color,
          uncertainColor,
          position: null, // Will be set when placed in yard
          inBowl: false
        }
      });
    }
  }

  // Create bowls (one of each color)
  for (let i = 0; i < COLORS.length; i++) {
    await prisma.bowl.create({
      data: {
        gameId: game.id,
        color: COLORS[i],
        position: i, // Distance from dog house
        value: 5 - i // Closest = 5 points, furthest = 1 point
      }
    });
  }

  // Initialize yard layout
  await initializeYard(game.id);

  // Start the game
  await prisma.game.update({
    where: { id: game.id },
    data: { status: 'playing' }
  });

  return game.id;
}

async function initializeYard(gameId: string): Promise<void> {
  const bones = await prisma.bone.findMany({ where: { gameId } });
  
  // Create all cards (bones and bowls) for shuffling
  const allCards: Array<{type: string, color: string, boneId?: string}> = [];
  
  // Add bone cards
  for (const bone of bones) {
    allCards.push({
      type: 'bone',
      color: bone.color,
      boneId: bone.id
    });
  }
  
  // Add bowl cards
  for (const color of COLORS) {
    allCards.push({
      type: 'bowl',
      color: color
    });
  }
  
  // Shuffle all cards
  for (let i = allCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
  }
  
  let position = 0;
  
  // Place shuffled cards
  for (const card of allCards) {
    await prisma.yardCard.create({
      data: {
        gameId,
        position: position,
        type: card.type,
        color: card.color
      }
    });

    // Update bone position if it's a bone card
    if (card.type === 'bone' && card.boneId) {
      await prisma.bone.update({
        where: { id: card.boneId },
        data: { position }
      });
    }

    position++;
  }
  
  // Place dog house at the far right (highest position)
  await prisma.yardCard.create({
    data: {
      gameId,
      position: position,
      type: 'doghouse'
    }
  });
}

async function calculateDynamicScores(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          bonesInHand: true
        }
      },
      bones: true,
      bowls: true,
      yardCards: { orderBy: { position: 'asc' } }
    }
  });

  if (!game) {
    throw new Error('Game not found');
  }

  // Find bowl positions in the current yard layout
  const bowlCards = game.yardCards.filter(card => card.type === 'bowl');
  
  // Calculate current bowl values based on distance from dog house
  const dogHouseCard = game.yardCards.find(card => card.type === 'doghouse');
  if (!dogHouseCard) {
    throw new Error('Dog house not found');
  }

  // Sort bowls by distance from dog house (closer = higher value)
  const bowlValues = bowlCards
    .map(bowlCard => ({
      color: bowlCard.color!,
      position: bowlCard.position,
      distanceFromDogHouse: Math.abs(dogHouseCard.position - bowlCard.position)
    }))
    .sort((a, b) => a.distanceFromDogHouse - b.distanceFromDogHouse)
    .reduce((acc, bowl, index) => {
      acc[bowl.color] = 5 - index; // Closest = 5, next = 4, etc.
      return acc;
    }, {} as Record<string, number>);

  // Calculate each player's current score
  const playerScores = game.players.map(player => {
    const buriedBones = game.bones.filter(bone => bone.inBowl && bone.buriedByPlayerId === player.id);
    const totalScore = buriedBones.reduce((score, bone) => {
      return score + (bowlValues[bone.color] || 0);
    }, 0);
    
    return {
      playerId: player.id,
      score: totalScore,
      buriedBones: buriedBones.map(bone => ({
        ...bone,
        currentValue: bowlValues[bone.color] || 0
      }))
    };
  });

  return { bowlValues, playerScores };
}

export async function getGameState(gameId: string) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      players: {
        include: {
          bonesInHand: true
        },
        orderBy: { position: 'asc' }
      },
      bones: true,
      bowls: { orderBy: { position: 'asc' } },
      yardCards: { orderBy: { position: 'asc' } }
    }
  });

  if (!game) {
    throw new Error('Game not found');
  }

  // Calculate dynamic scores
  const { bowlValues, playerScores } = await calculateDynamicScores(gameId);

  // Add calculated scores and bowl values to the response
  const gameWithDynamicScores = {
    ...game,
    bowlValues,
    players: game.players.map(player => {
      const playerScore = playerScores.find(ps => ps.playerId === player.id);
      return {
        ...player,
        score: playerScore?.score || 0,
        buriedBones: playerScore?.buriedBones || []
      };
    })
  };

  return gameWithDynamicScores;
}

export async function movePlayer(gameId: string, playerId: string, spaces: number): Promise<void> {
  if (Math.abs(spaces) < 1 || Math.abs(spaces) > 4) {
    throw new Error('Can move 1-4 spaces');
  }

  const game = await getGameState(gameId);
  const player = game.players.find(p => p.id === playerId);
  
  if (!player) {
    throw new Error('Player not found');
  }

  if (game.players[game.currentTurn].id !== playerId) {
    throw new Error('Not your turn');
  }

  if (game.actionsThisTurn >= 3) {
    throw new Error('Maximum 3 actions per turn');
  }

  const bonesInHand = player.bonesInHand.length;
  const maxMovement = 4 - bonesInHand;
  
  if (Math.abs(spaces) > maxMovement) {
    throw new Error(`Can only move ${maxMovement} spaces with ${bonesInHand} bones in hand`);
  }

  // Get sorted cards to determine visual positions
  const sortedCards = game.yardCards.sort((a, b) => a.position - b.position);
  
  // Find current player's visual index
  const currentVisualIndex = sortedCards.findIndex(card => card.position === player.yardPosition);
  
  if (currentVisualIndex === -1) {
    throw new Error('Player position not found in yard');
  }
  
  // Calculate new visual index
  const newVisualIndex = Math.max(0, Math.min(currentVisualIndex + spaces, sortedCards.length - 1));
  
  // Get the actual database position at the new visual index
  const newPosition = sortedCards[newVisualIndex].position;
  
  await prisma.player.update({
    where: { id: player.id },
    data: { yardPosition: newPosition }
  });

  // Increment action count
  const newActionCount = game.actionsThisTurn + 1;
  await prisma.game.update({
    where: { id: gameId },
    data: { actionsThisTurn: newActionCount }
  });

  // Auto-end turn if 3 actions reached
  if (newActionCount >= 3) {
    await endTurn(gameId);
  }
}

export async function digBone(gameId: string, playerId: string, replacementBoneId?: string): Promise<void> {
  const game = await getGameState(gameId);
  const player = game.players.find(p => p.id === playerId);
  
  if (!player) {
    throw new Error('Player not found');
  }

  if (game.players[game.currentTurn].id !== playerId) {
    throw new Error('Not your turn');
  }

  if (game.actionsThisTurn >= 3) {
    throw new Error('Maximum 3 actions per turn');
  }

  if (player.bonesInHand.length >= 3) {
    throw new Error('Cannot hold more than 3 bones');
  }

  // Find bone at player position
  const boneCard = game.yardCards.find(card => 
    card.type === 'bone' && card.position === player.yardPosition
  );

  if (!boneCard) {
    throw new Error('No bone at current position');
  }

  // Find the actual bone object
  const bone = game.bones.find(b => b.color === boneCard.color && b.position === player.yardPosition);
  
  if (!bone) {
    throw new Error('Bone not found');
  }

  // Reveal the bone's actual color
  await prisma.bone.update({
    where: { id: bone.id },
    data: {
      revealed: true,
      playerId: replacementBoneId === 'PUT_BACK' ? null : player.id,
      position: replacementBoneId === 'PUT_BACK' ? player.yardPosition : null
    }
  });

  // Remove bone card from yard only if not putting back
  if (replacementBoneId !== 'PUT_BACK') {
    await prisma.yardCard.delete({
      where: { id: boneCard.id }
    });

    // Check if player is now stranded (no card at their position)
    const updatedGame = await getGameState(gameId);
    const cardAtPlayerPosition = updatedGame.yardCards.find(card => card.position === player.yardPosition);
    
    if (!cardAtPlayerPosition) {
      // Player is stranded! Move them to the nearest card
      const sortedCards = updatedGame.yardCards.sort((a, b) => a.position - b.position);
      
      if (sortedCards.length > 0) {
        // Find the closest card to the player's current position
        let closestCard = sortedCards[0];
        let closestDistance = Math.abs(closestCard.position - player.yardPosition);
        
        for (const card of sortedCards) {
          const distance = Math.abs(card.position - player.yardPosition);
          if (distance < closestDistance) {
            closestCard = card;
            closestDistance = distance;
          }
        }
        
        // Move player to the closest card
        await prisma.player.update({
          where: { id: player.id },
          data: { yardPosition: closestCard.position }
        });
      }
    }
  }

  // Handle replacement bone logic
  if (replacementBoneId && replacementBoneId !== 'PUT_BACK') {
    // Player chose to replace a bone from their hand
    const replacementBone = player.bonesInHand.find(b => b.id === replacementBoneId);
    if (replacementBone) {
      // Put the replacement bone in the dug position
      await prisma.bone.update({
        where: { id: replacementBone.id },
        data: {
          position: player.yardPosition,
          playerId: null
        }
      });

      // Add yard card for the replacement bone
      await prisma.yardCard.create({
        data: {
          gameId,
          position: player.yardPosition,
          type: 'bone',
          color: replacementBone.color
        }
      });
    }
  } else if (replacementBoneId === 'PUT_BACK') {
    // Player chose to put the bone back - it stays in the yard but revealed
    // No additional action needed, bone is already updated above
  } else {
    // No replacement - implement "leap frog" with leftmost card
    const leftmostCards = game.yardCards.filter(card => card.position < player.yardPosition);
    
    if (leftmostCards.length > 0) {
      const leftmostCard = leftmostCards.reduce((leftmost, card) => 
        card.position < leftmost.position ? card : leftmost
      );

      // Store original position and find associated bone before any updates
      const originalLeftmostPosition = leftmostCard.position;
      const leftmostBone = leftmostCard.type === 'bone' ? 
        game.bones.find(b => b.position === originalLeftmostPosition) : null;
      
      // Check if any players are standing on the leftmost card that's about to be moved
      const playersOnLeftmostCard = game.players.filter(p => p.yardPosition === originalLeftmostPosition);
      
      // Move the leftmost card to the dig position first
      await prisma.yardCard.update({
        where: { id: leftmostCard.id },
        data: { position: player.yardPosition }
      });

      // If it's a bone card, update the bone position
      if (leftmostBone) {
        await prisma.bone.update({
          where: { id: leftmostBone.id },
          data: { position: player.yardPosition }
        });
      }
      
      // Move any players who were on the leftmost card to the new leftmost position
      if (playersOnLeftmostCard.length > 0) {
        // Find the new leftmost card after this one is moved
        const remainingCards = game.yardCards.filter(card => 
          card.id !== leftmostCard.id && card.position < player.yardPosition
        );
        
        if (remainingCards.length > 0) {
          const newLeftmostCard = remainingCards.reduce((leftmost, card) => 
            card.position < leftmost.position ? card : leftmost
          );
          
          // Move all players who were on the moved card to the new leftmost position
          for (const playerOnCard of playersOnLeftmostCard) {
            await prisma.player.update({
              where: { id: playerOnCard.id },
              data: { yardPosition: newLeftmostCard.position }
            });
          }
        }
      }
      
      // That's it! No need to shift other cards - just leave the leftmost position empty
    }
  }

  // Increment action count
  const newActionCount = game.actionsThisTurn + 1;
  await prisma.game.update({
    where: { id: gameId },
    data: { actionsThisTurn: newActionCount }
  });

  // Auto-end turn if 3 actions reached
  if (newActionCount >= 3) {
    await endTurn(gameId);
  }
}

export async function dropBone(gameId: string, playerId: string, boneId: string): Promise<void> {
  const game = await getGameState(gameId);
  const player = game.players.find(p => p.id === playerId);
  
  if (!player) {
    throw new Error('Player not found');
  }

  if (game.players[game.currentTurn].id !== playerId) {
    throw new Error('Not your turn');
  }

  if (game.actionsThisTurn >= 3) {
    throw new Error('Maximum 3 actions per turn');
  }

  const bone = player.bonesInHand.find(b => b.id === boneId);
  
  if (!bone) {
    throw new Error('Bone not in hand');
  }

  // Check if there's a matching bowl at current position
  const bowlCard = game.yardCards.find(card => 
    card.type === 'bowl' && 
    card.position === player.yardPosition && 
    card.color === bone.color
  );

  if (!bowlCard) {
    throw new Error('No matching bowl at current position');
  }

  // Note: Player score will be calculated dynamically based on current bowl positions

  // Mark bone as in bowl and remove from hand
  await prisma.bone.update({
    where: { id: bone.id },
    data: {
      inBowl: true,
      playerId: null,
      buriedByPlayerId: player.id
    }
  });

  // Increment action count
  const newActionCount = game.actionsThisTurn + 1;
  await prisma.game.update({
    where: { id: gameId },
    data: { actionsThisTurn: newActionCount }
  });

  // Auto-end turn if 3 actions reached
  if (newActionCount >= 3) {
    await endTurn(gameId);
  }
}

export async function dropAllBones(gameId: string, playerId: string, color: string): Promise<void> {
  const game = await getGameState(gameId);
  const player = game.players.find(p => p.id === playerId);
  
  if (!player) {
    throw new Error('Player not found');
  }

  if (game.players[game.currentTurn].id !== playerId) {
    throw new Error('Not your turn');
  }

  if (game.actionsThisTurn >= 3) {
    throw new Error('Maximum 3 actions per turn');
  }

  // Find all bones of the specified color in player's hand
  const bonesToDrop = player.bonesInHand.filter(b => b.color === color);
  
  if (bonesToDrop.length === 0) {
    throw new Error('No bones of that color in hand');
  }

  // Check if there's a matching bowl at current position
  const bowlCard = game.yardCards.find(card => 
    card.type === 'bowl' && 
    card.position === player.yardPosition && 
    card.color === color
  );

  if (!bowlCard) {
    throw new Error('No matching bowl at current position');
  }

  // Note: Player score will be calculated dynamically based on current bowl positions

  // Mark all bones as in bowl and remove from hand
  for (const bone of bonesToDrop) {
    await prisma.bone.update({
      where: { id: bone.id },
      data: {
        inBowl: true,
        playerId: null,
        buriedByPlayerId: player.id
      }
    });
  }

  // Increment action count (dropping all bones of a color counts as one action)
  const newActionCount = game.actionsThisTurn + 1;
  await prisma.game.update({
    where: { id: gameId },
    data: { actionsThisTurn: newActionCount }
  });

  // Auto-end turn if 3 actions reached
  if (newActionCount >= 3) {
    await endTurn(gameId);
  }
}

export async function endTurn(gameId: string): Promise<void> {
  const game = await getGameState(gameId);
  
  if (game.status !== 'playing') {
    throw new Error('Game is not in progress');
  }

  // Check if game should end
  const bonesInYard = game.yardCards.filter(card => card.type === 'bone').length;
  
  if (bonesInYard === 0) {
    // Game ends - only bowls remain next to dog house
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'finished' }
    });

    // Remove bones from hands (they don't count)
    await prisma.bone.updateMany({
      where: { 
        gameId,
        playerId: { not: null }
      },
      data: { playerId: null }
    });

    return;
  }

  // Move to next player and reset action count
  const nextTurn = (game.currentTurn + 1) % game.playerCount;
  
  await prisma.game.update({
    where: { id: gameId },
    data: { 
      currentTurn: nextTurn,
      actionsThisTurn: 0 
    }
  });
}