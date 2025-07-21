# DIG Board Game - Project Documentation for Claude

## Project Overview
This is an online implementation of the DIG board game, a turn-based strategy game for 2-4 players where players control dogs digging up bones to return them to matching colored bowls.

### Game Rules Summary
- Players are dogs moving around a yard with cards laid out horizontally
- Cards include: bone cards (20 total, 4 of each color), bowl cards (5 total, one per color), and a dog house
- Players can move 1-4 spaces, but movement is limited by bones in hand (max_movement = 4 - bones_in_hand)
- Players dig bones to reveal their true color, then can take them, replace with bones from hand, or put them back
- When a bone is taken and no replacement made, the leftmost card "leap frogs" to fill the empty space
- Goal: Return bones to matching colored bowls for points (closer bowls = more points)
- Turn limit: 3 actions per turn, then turn ends automatically

## Technical Architecture

### Backend Stack
- **Framework**: Node.js with Express
- **Database**: Prisma ORM with SQLite for development, PostgreSQL for production
- **Language**: TypeScript
- **Key Files**:
  - `server/src/game.ts` - Core game logic and state management
  - `server/src/index.ts` - API endpoints and server setup
  - `server/prisma/schema.prisma` - Database schema

### Frontend Stack
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with custom animations
- **State Management**: React hooks with real-time polling every 2 seconds
- **Key Files**:
  - `client/src/components/GameBoard.tsx` - Main game interface
  - `client/src/components/GameSetup.tsx` - Game creation and player setup

### Database Schema
- **Game**: Main game entity with status, current turn tracking
- **Player**: Player data with position, score, and selected icon
- **YardCard**: Represents physical card positions in the yard layout
- **Bone**: Bone entities with actual color, uncertain color, and revealed state
- **Bowl**: Scoring bowls with color and point values

## Key Implementation Details

### Card Positioning System
- Cards positioned absolutely using 52px intervals
- Layout: `left: ${position * 52}px`
- Cards are 48px wide (w-12 in Tailwind) with 4px spacing
- Player icons positioned at `${yardPosition * 52 + 24}px` to center under cards

### Animation System
The game uses multiple animation states managed separately:
- **flippingCards**: Set of card IDs currently performing flip animation
- **animatingCards**: Set of cards animating to player hands
- **movingCards**: Set of cards sliding to new positions (leftmost card replacement)
- **locallyRevealedBones**: Set of bone IDs revealed locally but not yet confirmed by server

### Dig State Machine
Critical flow that was recently perfected:
1. **Player clicks dig** → Bone immediately added to `locallyRevealedBones`
2. **Flip animation starts** → Card shows actual revealed color during flip
3. **Modal appears** → Player chooses: take bone, replace from hand, or put back
4. **Action executed** → Server processes choice, animations complete
5. **State cleanup** → Local states cleared, fresh game state fetched

### Critical Game Logic (server/src/game.ts)
- **digBone function**: Handles the complex dig-and-replace mechanics
- **movePlayer function**: Validates movement based on bones in hand
- **leftmost card logic**: When no replacement provided, leftmost card moves to fill gap

## Recent Major Fixes & Features

### Animation Polish (Latest Work)
- ✅ Fixed dig state machine to show revealed content during card flip
- ✅ Added smooth sliding animation for leftmost card replacement
- ✅ Fixed bone cards reverting to uncertain side after flip
- ✅ Implemented persistent local reveal state during dig operations

### UI Polish
- ✅ Removed "Revealed" text from bone cards
- ✅ Removed question marks from uncertain side of bones
- ✅ Removed color text labels from bowl cards
- ✅ Prevented duplicate puppy icon selection during setup

### Game Mechanics
- ✅ Fixed empty space issue when leftmost card moves to dig position
- ✅ Added "Put Back" option for dug bones
- ✅ Implemented proper card shuffling and positioning
- ✅ Added 3-action turn limit with automatic turn ending

## Development Commands
```bash
# Backend (from /server directory)
npm run dev     # Start development server with hot reload
npm run build   # Build TypeScript
npm start       # Run production server

# Frontend (from /client directory)  
npm run dev     # Start Vite development server
npm run build   # Build for production
npm run preview # Preview production build

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open database GUI
```

## Current Project State
- ✅ Fully functional game with all core mechanics implemented
- ✅ Polished UI with smooth animations throughout
- ✅ Proper error handling and input validation
- ✅ Responsive design optimized for desktop gameplay
- ✅ Real-time game state synchronization via polling

## Known Issues
- None currently identified - game is in a polished, production-ready state

## Potential Future Enhancements
- WebSocket integration for real-time multiplayer
- Sound effects and enhanced visual feedback
- Mobile responsive design improvements
- Game replay/history functionality
- Spectator mode
- Tournament bracket system

## Technical Notes for Future Development
- Card animations use CSS keyframes with React state management
- Local state is used for immediate UI feedback before server confirmation
- Game state polling prevents race conditions in multiplayer scenarios
- Absolute positioning enables smooth animations without layout shifts
- Prisma transactions ensure data consistency during complex game operations

## Critical Code Locations
- **Dig logic**: `server/src/game.ts:238-396` (digBone function)
- **Animation management**: `client/src/components/GameBoard.tsx:63-66` (state declarations)
- **Card rendering**: `client/src/components/GameBoard.tsx:348-374` (bone card display logic)
- **Game initialization**: `server/src/game.ts:12-165` (createGame and initializeYard)

This documentation should provide sufficient context for any future Claude sessions to quickly understand the project structure, recent changes, and technical implementation details.