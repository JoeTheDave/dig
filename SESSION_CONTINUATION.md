# Session Continuation Guide for Claude

## Quick Context for New Claude Sessions

### What This Project Is
An online implementation of the DIG board game - a turn-based strategy game where players are dogs digging up bones to return to matching colored bowls. Built with TypeScript full-stack (Node.js/Express backend, React frontend).

### Current Session Status (Latest)
**Project State**: ✅ FULLY FUNCTIONAL AND POLISHED
**Last Major Work**: Fixed dig state machine and animations (card flip reveals, leftmost card sliding)

### Recently Completed Features
1. **Dig State Machine**: Cards now properly flip to show revealed content and stay revealed
2. **Leftmost Card Animation**: Smooth sliding animation when leftmost card replaces dug bone
3. **UI Polish**: Removed text clutter, cleaner bone/bowl card appearance
4. **Put Back Option**: Players can dig bones and choose not to take them
5. **Animation Persistence**: Fixed cards reverting to uncertain side after animations

### Technical Context You Need to Know
- **Card Positioning**: Absolute positioning at 52px intervals
- **Animation States**: Multiple React state Sets manage different animation types
- **Local Reveal State**: `locallyRevealedBones` maintains UI state during dig operations
- **Real-time Sync**: Game state polling every 2 seconds prevents race conditions

### Current Architecture
```
dig/
├── server/          # Node.js/Express API
│   ├── src/game.ts  # Core game logic (CRITICAL FILE)
│   └── src/index.ts # API endpoints
├── client/          # React frontend  
│   └── src/components/
│       ├── GameBoard.tsx   # Main game UI (CRITICAL FILE)
│       └── GameSetup.tsx   # Player setup
└── CLAUDE.md        # Full project documentation
```

### If You Need to Make Changes
1. **Read CLAUDE.md first** - contains all architectural details
2. **Key files**: `server/src/game.ts` and `client/src/components/GameBoard.tsx`
3. **Build commands**: `npm run build` in both server/ and client/ directories
4. **Test command**: `npm run dev` in server/ directory

### Recent Code Locations
- **Dig logic**: Lines 238-396 in `server/src/game.ts`
- **Animation management**: Lines 63-66 in `client/src/components/GameBoard.tsx`
- **Card flip logic**: Lines 352-372 in `client/src/components/GameBoard.tsx`

### Known Issues
❌ **None currently** - project is in polished state

### Potential Next Steps (if user requests)
- Add sound effects
- Implement WebSocket real-time multiplayer
- Mobile responsive improvements
- Game statistics/replay features
- Tournament system

### Critical Implementation Notes
- **Never clear `locallyRevealedBones` completely** - it maintains dig state
- **Card animations use CSS keyframes** with React state for timing
- **Leftmost card logic** is in `digBone` function - don't break it
- **Absolute positioning** is essential for smooth animations

### Quick Debugging Tips
- If cards aren't animating: check animation state Sets
- If dig isn't working: check `locallyRevealedBones` state
- If layout breaks: verify 52px positioning calculations
- If game state is wrong: check API polling in `fetchGameState`

---

**For Claude**: This project required careful attention to animation timing, state management, and game logic. The user has been very focused on polish and smooth user experience. The most complex part is the dig state machine - treat it carefully if making changes.