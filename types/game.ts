export interface Question {
  id: string;
  question: string;
  answer: string;
  value: number;
  answered: boolean;
}

export interface Category {
  id: string;
  name: string;
  questions: Question[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

export interface BuzzerEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
}

export interface GameState {
  categories: Category[];
  players: Player[];
  currentQuestion: Question | null;
  buzzerActive: boolean;
  buzzerQueue: BuzzerEvent[];
  gameStarted: boolean;
  showAnswerToPlayers?: boolean;
}

export interface Lobby {
  code: string;
  hostId: string;
  lobbyName?: string;
  password?: string;
  createdAt: number;
  gameState: GameState;
  isActive: boolean;
  version: number; // Increments on any change
  lastModified: number; // Timestamp of last change
}

