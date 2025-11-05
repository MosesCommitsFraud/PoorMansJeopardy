export interface Question {
  id: string;
  question: string;
  answer: string;
  value: number;
  answered: boolean;
  questionImageUrl?: string; // URL to image or GIF for the question
  answerImageUrl?: string;   // URL to image or GIF for the answer
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
  timerEndAt?: number | null; // Timestamp when timer should end (null/undefined = no active timer)
  timerDuration?: number; // Duration in seconds (default 30)
  gameEnded?: boolean; // Whether the game has ended
  endedAt?: number; // Timestamp when the game ended
  winnerId?: string | null; // ID of the winner
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

export interface GameTemplate {
  id: string;
  name: string;
  categories: Category[];
  createdAt: number;
  lastModified: number;
}

