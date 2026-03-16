# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Battle City (坦克大战) 2D tank battle game** web remake built with Next.js. The project includes a complete game engine with player/enemy tanks, bullet system, collision detection, level progression, custom maps, and leaderboard functionality.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Supabase (PostgreSQL)
- **Testing**: Playwright

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
/app                     # Next.js pages (App Router)
  page.tsx              # Main game page with canvas
  login/page.tsx        # Login page
  register/page.tsx     # Registration page
  custom-maps/page.tsx  # Custom map management
  map-editor/page.tsx   # Map editor
  leaderboard/page.tsx  # Score leaderboard

/src/game/              # Core game engine (logic-only, no DOM dependencies)
  GameEngine.ts         # Main game orchestrator
  GameLoop.ts           # 60 FPS game loop
  InputManager.ts       # Keyboard input handling
  MapSystem.ts          # Map/tile management
  TankSystem.ts         # Tank creation and movement
  BulletSystem.ts       # Bullet physics
  Collision.ts          # Collision detection
  EnemyAI.ts            # Enemy AI behavior
  ScoreSystem.ts        # Scoring logic
  LevelSystem.ts        # Level progression
  types.ts              # TypeScript interfaces and enums

/src/lib/               # External integrations
  supabase.ts           # Supabase client
  auth.ts               # Authentication functions
  auth-context.tsx      # React auth context provider
  maps.ts               # Custom map CRUD
  leaderboard.ts         # Leaderboard operations

/src/config/
  gameConfig.ts         # All game constants (tank speeds, levels, etc.)

/supabase/              # Database schema
  01_users.sql
  02_custom_maps.sql
  03_leaderboard.sql
  init.sql
```

## Architecture

The game uses an **event-driven architecture** with strict separation:

1. **GameEngine** (`src/game/GameEngine.ts`) is the main orchestrator that coordinates all subsystems
2. Each subsystem (TankSystem, BulletSystem, MapSystem, etc.) is independent and testable
3. The rendering happens in React (`app/page.tsx`) using HTML5 Canvas, while game logic runs in pure TypeScript classes
4. Communication between game and UI happens through event callbacks (`game.on('event', callback)`)

### Game States
- `MENU` → `PLAYING` → `PAUSED` / `GAMEOVER` / `VICTORY`
- Press P to pause/resume

### Controls
- WASD or Arrow Keys: Move tank
- Space: Fire
- P: Pause/Resume

### Enemy Types
| Type | Speed | HP | Score |
|------|-------|-----|-------|
| Normal (Red) | 1 | 1 | 100 |
| Fast (Orange) | 2.5 | 1 | 200 |
| Heavy (Purple) | 0.5 | 3 | 300 |
| Armor (Blue) | 1 | 2 | 400 |

### Tile Types
- `EMPTY` (0): Passable
- `BRICK` (1): Destructible
- `STEEL` (2): Indestructible
- `GRASS` (3): Decorative only
- `WATER` (4): Impassable

## Database Schema (Supabase)

**users**: id, email, username, password, avatar, role, status, created_at
**custom_maps**: id, user_id, name, width, height, tiles (JSON), player_spawn, base_position, enemy_spawns, created_at
**leaderboard**: id, user_id, score, levels_completed, map_id, map_name, ip_address, country, created_at

## Development Notes

- Game logic is completely decoupled from React - GameEngine classes don't import any React code
- All game balance values (speeds, HP, damage, spawn intervals) are centralized in `src/config/gameConfig.ts`
- Unauthenticated users can play and save scores to localStorage; logged-in users sync to Supabase
- The game uses requestAnimationFrame via GameLoop class for smooth 60 FPS updates

## Key Files for Game Logic

- `src/game/types.ts:1-135` - All type definitions
- `src/config/gameConfig.ts:1-119` - All game constants
- `src/game/GameEngine.ts:1-477` - Main game orchestrator
- `src/game/Collision.ts` - Bullet-tank and bullet-wall collision
- `src/game/EnemyAI.ts` - Enemy movement and targeting logic
