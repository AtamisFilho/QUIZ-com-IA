import { create } from 'zustand'

export type GameView = 'landing' | 'create' | 'join' | 'lobby' | 'playing' | 'results' | 'admin' | 'solo' | 'profile' | 'subscription' | 'leaderboard' | 'daily'

export interface Player {
  id: string
  socketId?: string
  name: string
  avatar: string
  score: number
  streak: number
  isHost: boolean
  isConnected: boolean
}

export interface Question {
  index: number
  text: string
  options: string[]
  correctIndex: number
  category: string
  difficulty: string
}

export interface GameSettings {
  category: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
  language: string
  maxPlayers: number
  questionCount: number
  timePerQuestion: number
}

interface AnswerResult {
  isCorrect: boolean
  pointsEarned: number
  correctIndex: number
  explanation?: string
}

interface GameState {
  // View management
  currentView: GameView
  setCurrentView: (view: GameView) => void

  // Player info
  playerId: string | null
  playerName: string | null
  playerAvatar: string | null
  isHost: boolean
  setPlayerInfo: (info: { id: string; name: string; avatar: string; isHost: boolean }) => void

  // Game info
  gameCode: string | null
  gameId: string | null
  setGameInfo: (info: { code: string; id: string }) => void

  // Game state
  players: Player[]
  setPlayers: (players: Player[]) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updatePlayerScore: (playerId: string, score: number, streak: number) => void

  // Game settings
  gameSettings: GameSettings | null
  setGameSettings: (settings: GameSettings) => void

  // Host flag
  setIsHost: (isHost: boolean) => void

  // Quiz state
  currentQuestion: Question | null
  currentQuestionIndex: number
  totalQuestions: number
  timeRemaining: number
  selectedOption: number | null
  hasSubmittedAnswer: boolean
  answerResult: AnswerResult | null
  showResult: boolean

  setQuestion: (question: Question, totalQuestions: number) => void
  setTimeRemaining: (time: number) => void
  setSelectedOption: (option: number | null) => void
  setHasSubmittedAnswer: (submitted: boolean) => void
  setAnswerResult: (result: AnswerResult | null) => void
  setShowResult: (show: boolean) => void

  // Results
  finalResults: Player[]
  setFinalResults: (results: Player[]) => void

  // Connection
  isConnected: boolean
  setIsConnected: (connected: boolean) => void

  // User profile
  userProfile: { level: number; xp: number; tier: string } | null
  setUserProfile: (profile: { level: number; xp: number; tier: string } | null) => void

  // Subscription tier
  subscriptionTier: string
  setSubscriptionTier: (tier: string) => void

  // Error
  error: string | null
  setError: (error: string | null) => void

  // Reset
  reset: () => void
}

const initialState = {
  currentView: 'landing' as GameView,
  playerId: null,
  playerName: null,
  playerAvatar: null,
  isHost: false,
  gameCode: null,
  gameId: null,
  players: [],
  gameSettings: null,
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  timeRemaining: 0,
  selectedOption: null,
  hasSubmittedAnswer: false,
  answerResult: null,
  showResult: false,
  finalResults: [],
  userProfile: null,
  subscriptionTier: 'free',
  isConnected: false,
  error: null,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setCurrentView: (view) => set({ currentView: view }),

  setPlayerInfo: (info) =>
    set({
      playerId: info.id,
      playerName: info.name,
      playerAvatar: info.avatar,
      isHost: info.isHost,
    }),

  setGameInfo: (info) =>
    set({
      gameCode: info.code,
      gameId: info.id,
    }),

  setPlayers: (players) => set({ players }),

  addPlayer: (player) =>
    set((state) => {
      const exists = state.players.some((p) => p.id === player.id)
      if (exists) {
        return {
          players: state.players.map((p) => (p.id === player.id ? player : p)),
        }
      }
      return { players: [...state.players, player] }
    }),

  removePlayer: (playerId) =>
    set((state) => ({
      players: state.players.filter((p) => p.id !== playerId),
    })),

  updatePlayerScore: (playerId, score, streak) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.id === playerId ? { ...p, score, streak } : p
      ),
    })),

  setGameSettings: (settings) => set({ gameSettings: settings }),
  setIsHost: (isHost) => set({ isHost }),

  setQuestion: (question, totalQuestions) =>
    set({
      currentQuestion: question,
      currentQuestionIndex: question.index,
      totalQuestions,
      selectedOption: null,
      hasSubmittedAnswer: false,
      answerResult: null,
      showResult: false,
    }),

  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setSelectedOption: (option) => set({ selectedOption: option }),
  setHasSubmittedAnswer: (submitted) => set({ hasSubmittedAnswer: submitted }),
  setAnswerResult: (result) => set({ answerResult: result }),
  setShowResult: (show) => set({ showResult: show }),

  setFinalResults: (results) => set({ finalResults: results }),

  setUserProfile: (profile) => set({ userProfile: profile }),
  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),

  setIsConnected: (connected) => set({ isConnected: connected }),
  setError: (error) => set({ error }),

  reset: () => set(initialState),
}))
