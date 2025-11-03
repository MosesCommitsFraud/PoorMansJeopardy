import { GameState, Category, Player, Question, BuzzerEvent } from "@/types/game";

// Simple in-memory store (in production, you'd use a database)
class GameStore {
  private state: GameState = {
    categories: [],
    players: [],
    currentQuestion: null,
    buzzerActive: false,
    buzzerQueue: [],
    gameStarted: false,
  };

  getState(): GameState {
    return { ...this.state };
  }

  setCategories(categories: Category[]) {
    this.state.categories = categories;
  }

  addPlayer(player: Player) {
    if (!this.state.players.find(p => p.id === player.id)) {
      this.state.players.push(player);
    }
  }

  updatePlayerScore(playerId: string, points: number) {
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.score += points;
    }
  }

  setCurrentQuestion(question: Question | null) {
    this.state.currentQuestion = question;
    this.state.buzzerQueue = [];
  }

  markQuestionAnswered(categoryId: string, questionId: string) {
    const category = this.state.categories.find(c => c.id === categoryId);
    if (category) {
      const question = category.questions.find(q => q.id === questionId);
      if (question) {
        question.answered = true;
      }
    }
  }

  activateBuzzer() {
    this.state.buzzerActive = true;
    this.state.buzzerQueue = [];
  }

  deactivateBuzzer() {
    this.state.buzzerActive = false;
  }

  addBuzzer(buzzerEvent: BuzzerEvent) {
    if (this.state.buzzerActive) {
      // Only add if not already in queue
      if (!this.state.buzzerQueue.find(b => b.playerId === buzzerEvent.playerId)) {
        this.state.buzzerQueue.push(buzzerEvent);
      }
    }
  }

  getBuzzerQueue(): BuzzerEvent[] {
    return [...this.state.buzzerQueue].sort((a, b) => a.timestamp - b.timestamp);
  }

  clearBuzzerQueue() {
    this.state.buzzerQueue = [];
  }

  startGame() {
    this.state.gameStarted = true;
  }

  resetGame() {
    this.state = {
      categories: this.state.categories,
      players: [],
      currentQuestion: null,
      buzzerActive: false,
      buzzerQueue: [],
      gameStarted: false,
    };
  }

  // Create default game
  createDefaultGame() {
    const categories: Category[] = [
      {
        id: "1",
        name: "History",
        questions: [
          { id: "1-1", question: "This war lasted from 1939 to 1945", answer: "What is World War II?", value: 200, answered: false },
          { id: "1-2", question: "This document was signed in 1776", answer: "What is the Declaration of Independence?", value: 400, answered: false },
          { id: "1-3", question: "This president issued the Emancipation Proclamation", answer: "Who is Abraham Lincoln?", value: 600, answered: false },
          { id: "1-4", question: "The Berlin Wall fell in this year", answer: "What is 1989?", value: 800, answered: false },
          { id: "1-5", question: "This empire was ruled by Julius Caesar", answer: "What is the Roman Empire?", value: 1000, answered: false },
        ]
      },
      {
        id: "2",
        name: "Science",
        questions: [
          { id: "2-1", question: "This is the chemical symbol for gold", answer: "What is Au?", value: 200, answered: false },
          { id: "2-2", question: "This planet is known as the Red Planet", answer: "What is Mars?", value: 400, answered: false },
          { id: "2-3", question: "This is the powerhouse of the cell", answer: "What is mitochondria?", value: 600, answered: false },
          { id: "2-4", question: "This force keeps planets in orbit", answer: "What is gravity?", value: 800, answered: false },
          { id: "2-5", question: "This scientist developed the theory of relativity", answer: "Who is Albert Einstein?", value: 1000, answered: false },
        ]
      },
      {
        id: "3",
        name: "Geography",
        questions: [
          { id: "3-1", question: "This is the capital of France", answer: "What is Paris?", value: 200, answered: false },
          { id: "3-2", question: "This is the longest river in the world", answer: "What is the Nile?", value: 400, answered: false },
          { id: "3-3", question: "This is the largest continent", answer: "What is Asia?", value: 600, answered: false },
          { id: "3-4", question: "This mountain is the tallest in the world", answer: "What is Mount Everest?", value: 800, answered: false },
          { id: "3-5", question: "This is the smallest country in the world", answer: "What is Vatican City?", value: 1000, answered: false },
        ]
      },
      {
        id: "4",
        name: "Literature",
        questions: [
          { id: "4-1", question: "This author wrote 'Romeo and Juliet'", answer: "Who is William Shakespeare?", value: 200, answered: false },
          { id: "4-2", question: "This novel features a character named Atticus Finch", answer: "What is 'To Kill a Mockingbird'?", value: 400, answered: false },
          { id: "4-3", question: "This dystopian novel was written by George Orwell", answer: "What is '1984'?", value: 600, answered: false },
          { id: "4-4", question: "This epic poem was written by Homer", answer: "What is 'The Odyssey'?", value: 800, answered: false },
          { id: "4-5", question: "This Russian author wrote 'War and Peace'", answer: "Who is Leo Tolstoy?", value: 1000, answered: false },
        ]
      },
      {
        id: "5",
        name: "Sports",
        questions: [
          { id: "5-1", question: "This sport is known as 'America's pastime'", answer: "What is baseball?", value: 200, answered: false },
          { id: "5-2", question: "This tournament is known as 'The Masters'", answer: "What is golf?", value: 400, answered: false },
          { id: "5-3", question: "This country has won the most FIFA World Cups", answer: "What is Brazil?", value: 600, answered: false },
          { id: "5-4", question: "This boxer was known as 'The Greatest'", answer: "Who is Muhammad Ali?", value: 800, answered: false },
          { id: "5-5", question: "This is the number of players on a basketball team", answer: "What is 5?", value: 1000, answered: false },
        ]
      },
    ];

    this.setCategories(categories);
  }
}

export const gameStore = new GameStore();

