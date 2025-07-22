import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { prisma } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

import { createGame, getGameState, GameSetup, movePlayer, digBone, dropBone, dropAllBones, endTurn } from './game';

// Create a new game
app.post('/api/games', async (req, res) => {
  try {
    const setup: GameSetup = req.body;
    const gameId = await createGame(setup);
    res.json({ gameId });
  } catch (error) {
    console.error('Game creation error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create game' });
  }
});

// Get game state
app.get('/api/games/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const gameState = await getGameState(gameId);
    res.json(gameState);
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(404).json({ error: error instanceof Error ? error.message : 'Game not found' });
  }
});

// Move player
app.post('/api/games/:gameId/move', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, spaces } = req.body;
    await movePlayer(gameId, playerId, spaces);
    res.json({ success: true });
  } catch (error) {
    console.error('Move error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Move failed' });
  }
});

// Dig bone
app.post('/api/games/:gameId/dig', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, replacementBoneId } = req.body;
    await digBone(gameId, playerId, replacementBoneId);
    res.json({ success: true });
  } catch (error) {
    console.error('Dig error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Dig failed' });
  }
});

// Drop bone
app.post('/api/games/:gameId/drop', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, boneId } = req.body;
    await dropBone(gameId, playerId, boneId);
    res.json({ success: true });
  } catch (error) {
    console.error('Drop error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Drop failed' });
  }
});

// Drop all bones of a color
app.post('/api/games/:gameId/drop-all', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, color } = req.body;
    await dropAllBones(gameId, playerId, color);
    res.json({ success: true });
  } catch (error) {
    console.error('Drop all error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Drop failed' });
  }
});

// End turn
app.post('/api/games/:gameId/end-turn', async (req, res) => {
  try {
    const { gameId } = req.params;
    await endTurn(gameId);
    res.json({ success: true });
  } catch (error) {
    console.error('End turn error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'End turn failed' });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});