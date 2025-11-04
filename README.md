# Jeopardy Game

An interactive Jeopardy game built with Next.js 15, featuring host and player views with real-time buzzer functionality.

## Features

- 🎮 **Host Setup Interface**: Create custom categories and questions with different point values (200-1000)
- 👑 **Host Game View**: Control the game with answers visible, manage players, and control the buzzer system
- 🎯 **Player View**: Join the game, buzz in to answer questions, and track your score
- ⚡ **Real-time Buzzer System**: Fair buzzer queue system that tracks who buzzed in first
- 📊 **Score Management**: Automatic score tracking with manual adjustment options for the host
- 🎨 **Modern UI**: Beautiful interface built with shadcn/ui components and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 22+ installed
- pnpm package manager (`npm install -g pnpm`)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Run the development server:
```bash
pnpm dev
```

3. Open your browser:
   - Main menu: [http://localhost:3000](http://localhost:3000)
   - Host Setup: [http://localhost:3000/host/setup](http://localhost:3000/host/setup)
   - Host Game: [http://localhost:3000/host/game](http://localhost:3000/host/game)
   - Player View: [http://localhost:3000/player](http://localhost:3000/player)

## How to Play

### For the Host:

1. **Setup Phase**:
   - Go to the Host Setup page
   - Either create your own categories and questions, or load the default game
   - Each category should have 5 questions with values: $200, $400, $600, $800, $1000
   - Click "Save & Start" when ready

2. **Game Phase**:
   - Add players as they join (or have them join through the player view)
   - Click on any question tile to reveal it
   - Click "Activate" to enable the buzzer for players
   - See the buzzer queue in order of who pressed first
   - Show/hide the answer as needed
   - Adjust player scores manually using the +/- buttons
   - Close questions to mark them as answered

### For Players:

1. **Join**:
   - Go to the Player View page
   - Enter your name and join the game

2. **Play**:
   - Watch the screen for the current question
   - When the buzzer is active, press SPACEBAR or click the BUZZ IN button
   - Your position in the buzzer queue will be displayed
   - Track your score and see how you rank against other players

## Game Rules

- The host controls when the buzzer is active
- Buzzer presses are queued in the order they were received
- Once you buzz in, you cannot buzz again until the buzzer is reset
- The host can manually adjust scores for correct/incorrect answers
- Questions can only be selected once (they disappear after being answered)

## Technical Details

### Project Structure

```
├── app/
│   ├── api/              # API routes for game state management
│   ├── host/             # Host-specific pages (setup, game)
│   ├── player/           # Player view page
│   └── page.tsx          # Main landing page
├── components/
│   └── ui/               # Reusable UI components (shadcn/ui)
├── lib/
│   ├── game-store.ts     # In-memory game state management
│   └── utils.ts          # Utility functions
└── types/
    └── game.ts           # TypeScript type definitions
```

### API Endpoints

- `GET /api/game/state` - Get current game state
- `POST /api/game/setup` - Setup game with categories
- `POST /api/game/default` - Load default game
- `POST /api/game/question` - Select/answer questions
- `GET/POST /api/game/buzzer` - Buzzer control and status
- `POST /api/game/player` - Player management

### Technologies Used

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with improved performance
- **TypeScript 5.7** - Type-safe code
- **Tailwind CSS v4** - Modern CSS-first utility framework
- **shadcn/ui** - Beautiful, accessible components
- **Lucide React** - Icon library
- **pnpm** - Fast, disk space efficient package manager

## Future Enhancements

- Database persistence (currently in-memory)
- WebSocket support for true real-time updates
- Sound effects for buzzer
- Timer for questions
- Multiple game sessions
- Game history and statistics
- Mobile-optimized layouts
- Daily Double questions
- Final Jeopardy round

## License

MIT License - feel free to use this for your game nights!

