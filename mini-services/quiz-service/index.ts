/**
 * QUIZ AI - Socket.IO Service
 * 
 * Scaling Architecture:
 * - Single instance: Works without Redis (development)
 * - Cluster mode: Set REDIS_URL to enable Redis adapter (production)
 * - Multiple instances behind a load balancer with sticky sessions
 * 
 * Environment Variables:
 * - PORT: Server port (default: 3003)
 * - REDIS_URL: Redis connection URL (optional, enables cluster mode)
 * - AI_API_URL: URL for AI question generation (default: http://localhost:3000)
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

// ============================================================
// Configuration
// ============================================================

const config = {
  port: parseInt(process.env.PORT || '3003', 10),
  redisUrl: process.env.REDIS_URL || '',
  aiApiUrl: process.env.AI_API_URL || 'http://localhost:3000',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  disconnectRemovalTimeout: 60000,
  answerRevealDelay: 3000,
}

// ============================================================
// HTTP Server + Socket.IO
// ============================================================

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: config.cors,
  pingTimeout: config.pingTimeout,
  pingInterval: config.pingInterval,
})

// Health check endpoint - must be registered after socket.io
httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      connections: io.sockets.sockets.size,
    }))
    return
  }
  // Let other requests fall through to socket.io
})

// ============================================================
// Redis Adapter for horizontal scaling
// ============================================================

const REDIS_URL = config.redisUrl
if (REDIS_URL) {
  try {
    const { createClient } = await import('redis')
    const pubClient = createClient({ url: REDIS_URL })
    const subClient = pubClient.duplicate()
    await Promise.all([pubClient.connect(), subClient.connect()])
    io.adapter(new (await import('@socket.io/redis-adapter')).RedisAdapter(pubClient, subClient))
    console.log('[Quiz Service] Redis adapter connected')
  } catch (err) {
    console.warn('[Quiz Service] Redis connection failed, running in standalone mode:', err)
  }
} else {
  console.log('[Quiz Service] Running in standalone mode (no Redis)')
}

// ============================================================
// Types
// ============================================================

interface GameSettings {
  category: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
  language: string
  maxPlayers: number
  questionCount: number
  timePerQuestion: number
}

interface PlayerState {
  id: string
  socketId: string
  name: string
  avatar: string
  score: number
  streak: number
  isHost: boolean
  isConnected: boolean
}

interface Question {
  index: number
  text: string
  options: string[]
  correctIndex: number
  category: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
}

interface PlayerAnswer {
  playerId: string
  selectedIndex: number
  responseTime: number
  isCorrect: boolean
  pointsEarned: number
}

interface GameRoom {
  code: string
  hostSocketId: string
  players: Map<string, PlayerState>
  status: 'WAITING' | 'PLAYING' | 'QUESTION' | 'ANSWER_REVEAL' | 'FINISHED'
  settings: GameSettings
  currentQuestionIndex: number
  questions: Question[]
  answers: Map<string, PlayerAnswer[]>
  timer: ReturnType<typeof setTimeout> | null
  timeRemaining: number
  disconnectTimers: Map<string, ReturnType<typeof setTimeout>>
}

// ============================================================
// In-Memory Store
// ============================================================

const rooms = new Map<string, GameRoom>()
const socketToRoom = new Map<string, string>()
const socketToPlayerId = new Map<string, string>()

// ============================================================
// Helpers
// ============================================================

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆',
  '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛',
  '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️',
]

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 10)
}

function getRandomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

function getUniqueRoomCode(): string {
  let code = generateRoomCode()
  let attempts = 0
  while (rooms.has(code) && attempts < 100) { code = generateRoomCode(); attempts++ }
  return code
}

// ============================================================
// Sample Questions
// ============================================================

const SAMPLE_QUESTIONS: Omit<Question, 'index'>[] = [
  { text: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctIndex: 2, category: 'Geography', difficulty: 'EASY' },
  { text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1, category: 'Science', difficulty: 'EASY' },
  { text: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correctIndex: 3, category: 'Geography', difficulty: 'EASY' },
  { text: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Michelangelo'], correctIndex: 2, category: 'Art', difficulty: 'MEDIUM' },
  { text: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correctIndex: 2, category: 'Science', difficulty: 'MEDIUM' },
  { text: 'In which year did World War II end?', options: ['1943', '1944', '1945', '1946'], correctIndex: 2, category: 'History', difficulty: 'MEDIUM' },
  { text: 'What is the smallest country in the world?', options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'], correctIndex: 1, category: 'Geography', difficulty: 'MEDIUM' },
  { text: 'Which element has the atomic number 1?', options: ['Helium', 'Hydrogen', 'Lithium', 'Carbon'], correctIndex: 1, category: 'Science', difficulty: 'EASY' },
  { text: 'What is the longest river in the world?', options: ['Amazon', 'Nile', 'Mississippi', 'Yangtze'], correctIndex: 1, category: 'Geography', difficulty: 'HARD' },
  { text: 'Who wrote "Romeo and Juliet"?', options: ['Dickens', 'Shakespeare', 'Austen', 'Twain'], correctIndex: 1, category: 'Literature', difficulty: 'EASY' },
  { text: 'What is the speed of light approximately?', options: ['300,000 km/s', '150,000 km/s', '500,000 km/s', '1,000,000 km/s'], correctIndex: 0, category: 'Science', difficulty: 'MEDIUM' },
  { text: 'Which country has the most population?', options: ['USA', 'India', 'China', 'Indonesia'], correctIndex: 1, category: 'Geography', difficulty: 'MEDIUM' },
  { text: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], correctIndex: 2, category: 'Science', difficulty: 'EASY' },
  { text: 'Who discovered penicillin?', options: ['Marie Curie', 'Alexander Fleming', 'Louis Pasteur', 'Joseph Lister'], correctIndex: 1, category: 'Science', difficulty: 'HARD' },
  { text: 'What is the largest mammal?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippopotamus'], correctIndex: 1, category: 'Nature', difficulty: 'EASY' },
  { text: 'In which continent is Brazil located?', options: ['North America', 'Europe', 'South America', 'Africa'], correctIndex: 2, category: 'Geography', difficulty: 'EASY' },
  { text: 'What is the boiling point of water at sea level?', options: ['90°C', '100°C', '110°C', '120°C'], correctIndex: 1, category: 'Science', difficulty: 'EASY' },
  { text: 'Which organ in the human body is the largest?', options: ['Heart', 'Liver', 'Brain', 'Skin'], correctIndex: 3, category: 'Science', difficulty: 'HARD' },
  { text: 'What year was the first iPhone released?', options: ['2005', '2006', '2007', '2008'], correctIndex: 2, category: 'Technology', difficulty: 'MEDIUM' },
  { text: 'Which gas do plants absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correctIndex: 2, category: 'Science', difficulty: 'EASY' },
]

function generateQuestions(count: number, difficulty: string): Question[] {
  let pool = [...SAMPLE_QUESTIONS]
  if (difficulty !== 'MIXED') {
    const filtered = pool.filter(q => q.difficulty === difficulty)
    if (filtered.length >= count) pool = filtered
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const selected = pool.slice(0, Math.min(count, pool.length))
  while (selected.length < count) {
    selected.push({ ...pool[selected.length % pool.length] })
  }
  return selected.map((q, i) => ({ ...q, index: i }))
}

// ============================================================
// Scoring
// ============================================================

function calculateScore(isCorrect: boolean, responseTime: number, timePerQuestion: number, streak: number): number {
  if (!isCorrect) return 0
  const base = 100
  const timeRatio = 1 - Math.min(responseTime / (timePerQuestion * 1000), 1)
  const speedBonus = Math.round(timeRatio * 50)
  const streakBonus = Math.min(streak, 10) * 10
  return base + speedBonus + streakBonus
}

// ============================================================
// Serialization
// ============================================================

interface SerializedPlayer {
  id: string; name: string; avatar: string;
  score: number; streak: number; isHost: boolean; isConnected: boolean;
}

interface SerializedRoomState {
  code: string; status: GameRoom['status']; settings: GameSettings;
  currentQuestionIndex: number; totalQuestions: number;
  players: SerializedPlayer[]; timeRemaining: number;
}

function serializeRoomState(room: GameRoom): SerializedRoomState {
  const players: SerializedPlayer[] = []
  room.players.forEach(p => {
    players.push({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, isHost: p.isHost, isConnected: p.isConnected })
  })
  return {
    code: room.code, status: room.status, settings: room.settings,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestions: room.questions.length, players, timeRemaining: room.timeRemaining,
  }
}

// ============================================================
// Timer Management
// ============================================================

function startQuestionTimer(room: GameRoom) {
  clearQuestionTimer(room)
  room.timeRemaining = room.settings.timePerQuestion
  io.to(room.code).emit('timer-sync', { timeRemaining: room.timeRemaining })

  room.timer = setInterval(() => {
    room.timeRemaining -= 1
    if (room.timeRemaining <= 0) {
      room.timeRemaining = 0
      clearQuestionTimer(room)
      handleQuestionTimeout(room)
    }
    io.to(room.code).emit('timer-sync', { timeRemaining: room.timeRemaining })
  }, 1000)
}

function clearQuestionTimer(room: GameRoom) {
  if (room.timer) { clearInterval(room.timer); room.timer = null }
}

// ============================================================
// Question Flow
// ============================================================

function handleQuestionTimeout(room: GameRoom) {
  const currentAnswers = room.answers.get(String(room.currentQuestionIndex)) || []
  room.players.forEach(player => {
    if (!player.isConnected) return
    if (!currentAnswers.some(a => a.playerId === player.id)) {
      currentAnswers.push({ playerId: player.id, selectedIndex: -1, responseTime: room.settings.timePerQuestion * 1000, isCorrect: false, pointsEarned: 0 })
    }
  })
  room.answers.set(String(room.currentQuestionIndex), currentAnswers)
  revealAnswer(room)
}

function revealAnswer(room: GameRoom) {
  room.status = 'ANSWER_REVEAL'
  const question = room.questions[room.currentQuestionIndex]
  const currentAnswers = room.answers.get(String(room.currentQuestionIndex)) || []

  currentAnswers.forEach(answer => {
    const player = room.players.get(answer.playerId)
    if (!player) return
    if (answer.isCorrect) { player.streak += 1; player.score += answer.pointsEarned }
    else { player.streak = 0 }
  })

  const resultAnswers = currentAnswers.map(a => {
    const player = room.players.get(a.playerId)
    return {
      playerId: a.playerId, playerName: player?.name || 'Unknown', playerAvatar: player?.avatar || '❓',
      selectedIndex: a.selectedIndex, isCorrect: a.isCorrect, pointsEarned: a.pointsEarned, responseTime: a.responseTime,
    }
  })

  const leaderboard = getLeaderboard(room)

  io.to(room.code).emit('question-result', {
    questionIndex: room.currentQuestionIndex,
    correctIndex: question.correctIndex,
    correctOption: question.options[question.correctIndex],
    answers: resultAnswers,
    leaderboard,
  })

  io.to(room.code).emit('score-update', { players: leaderboard })

  setTimeout(() => {
    if (room.status === 'FINISHED') return
    if (room.currentQuestionIndex >= room.questions.length - 1) endGame(room)
    else sendNextQuestion(room)
  }, config.answerRevealDelay)
}

function sendNextQuestion(room: GameRoom) {
  room.currentQuestionIndex += 1
  room.status = 'QUESTION'
  const question = room.questions[room.currentQuestionIndex]

  io.to(room.code).emit('next-question', {
    index: question.index, text: question.text, options: question.options,
    category: question.category, difficulty: question.difficulty,
    timePerQuestion: room.settings.timePerQuestion,
  })

  startQuestionTimer(room)
}

function endGame(room: GameRoom) {
  room.status = 'FINISHED'
  clearQuestionTimer(room)
  const leaderboard = getLeaderboard(room)
  io.to(room.code).emit('game-ended', { leaderboard, roomCode: room.code })
}

function getLeaderboard(room: GameRoom) {
  const players: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }> = []
  room.players.forEach(p => {
    players.push({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, streak: p.streak, isHost: p.isHost, isConnected: p.isConnected })
  })
  players.sort((a, b) => b.score - a.score)
  return players
}

function allConnectedPlayersAnswered(room: GameRoom): boolean {
  const currentAnswers = room.answers.get(String(room.currentQuestionIndex)) || []
  const answeredIds = new Set(currentAnswers.map(a => a.playerId))
  let allAnswered = true
  room.players.forEach(p => { if (p.isConnected && !answeredIds.has(p.id)) allAnswered = false })
  return allAnswered
}

// ============================================================
// Host Transfer
// ============================================================

function transferHost(room: GameRoom) {
  let newHost: PlayerState | null = null
  room.players.forEach(p => { if (!p.isHost && p.isConnected && !newHost) newHost = p })
  if (newHost) {
    room.players.forEach(p => { p.isHost = false })
    newHost.isHost = true
    room.hostSocketId = newHost.socketId
    io.to(room.code).emit('player-joined', {
      player: { id: newHost.id, name: newHost.name, avatar: newHost.avatar, score: newHost.score, streak: newHost.streak, isHost: true, isConnected: true },
      message: `${newHost.name} is now the host`,
    })
    io.to(newHost.socketId).emit('room-state', serializeRoomState(room))
  }
}

// ============================================================
// Socket.IO Connection Handler
// ============================================================

io.on('connection', (socket: Socket) => {
  console.log(`[Connect] ${socket.id}`)

  socket.on('create-room', (data: { settings: GameSettings; playerName: string; playerId?: string }) => {
    const { settings, playerName, playerId: providedPlayerId } = data
    const code = getUniqueRoomCode()
    const playerId = providedPlayerId || generatePlayerId()
    const avatar = getRandomAvatar()

    const player: PlayerState = { id: playerId, socketId: socket.id, name: playerName, avatar, score: 0, streak: 0, isHost: true, isConnected: true }

    const room: GameRoom = {
      code, hostSocketId: socket.id, players: new Map(), status: 'WAITING', settings,
      currentQuestionIndex: -1, questions: [], answers: new Map(), timer: null, timeRemaining: 0, disconnectTimers: new Map(),
    }

    room.players.set(playerId, player)
    rooms.set(code, room)
    socketToRoom.set(socket.id, code)
    socketToPlayerId.set(socket.id, playerId)
    socket.join(code)

    room.questions = generateQuestions(settings.questionCount, settings.difficulty)

    socket.emit('create-room', { code, playerId, avatar, state: serializeRoomState(room) })
    console.log(`[Room ${code}] Created by ${playerName}`)
  })

  socket.on('join-room', (data: { code: string; playerName: string; playerId?: string }) => {
    const { code, playerName, playerId: providedPlayerId } = data
    const room = rooms.get(code.toUpperCase())

    if (!room) { socket.emit('error', { message: 'Room not found', code: 'ROOM_NOT_FOUND' }); return }
    if (room.status !== 'WAITING') { socket.emit('error', { message: 'Game already in progress', code: 'GAME_IN_PROGRESS' }); return }

    const connectedCount = Array.from(room.players.values()).filter(p => p.isConnected).length
    if (connectedCount >= room.settings.maxPlayers) { socket.emit('error', { message: 'Room is full', code: 'ROOM_FULL' }); return }

    const nameExists = Array.from(room.players.values()).some(p => p.name.toLowerCase() === playerName.toLowerCase() && p.isConnected)
    if (nameExists) { socket.emit('error', { message: 'Name already taken', code: 'NAME_TAKEN' }); return }

    const playerId = providedPlayerId || generatePlayerId()
    const avatar = getRandomAvatar()

    const player: PlayerState = { id: playerId, socketId: socket.id, name: playerName, avatar, score: 0, streak: 0, isHost: false, isConnected: true }

    room.players.set(playerId, player)
    socketToRoom.set(socket.id, code.toUpperCase())
    socketToPlayerId.set(socket.id, playerId)
    socket.join(code.toUpperCase())

    const disconnectTimer = room.disconnectTimers.get(playerId)
    if (disconnectTimer) { clearTimeout(disconnectTimer); room.disconnectTimers.delete(playerId) }

    socket.emit('join-room', { playerId, avatar, state: serializeRoomState(room) })
    socket.to(code.toUpperCase()).emit('player-joined', {
      player: { id: player.id, name: player.name, avatar: player.avatar, score: player.score, streak: player.streak, isHost: player.isHost, isConnected: true },
      message: `${playerName} joined the room`,
    })
    console.log(`[Room ${code.toUpperCase()}] ${playerName} joined`)
  })

  socket.on('leave-room', () => {
    const roomCode = socketToRoom.get(socket.id)
    const playerId = socketToPlayerId.get(socket.id)
    if (!roomCode || !playerId) return
    const room = rooms.get(roomCode)
    if (!room) return
    const player = room.players.get(playerId)
    if (!player) return

    room.players.delete(playerId)
    socket.leave(roomCode)
    socketToRoom.delete(socket.id)
    socketToPlayerId.delete(socket.id)

    const dt = room.disconnectTimers.get(playerId)
    if (dt) { clearTimeout(dt); room.disconnectTimers.delete(playerId) }

    socket.to(roomCode).emit('player-left', {
      player: { id: player.id, name: player.name, avatar: player.avatar, score: player.score, streak: player.streak, isHost: player.isHost, isConnected: false },
      message: `${player.name} left the room`,
    })

    if (player.isHost) transferHost(room)
    if (room.players.size === 0) { clearQuestionTimer(room); rooms.delete(roomCode) }
    console.log(`[Room ${roomCode}] ${player.name} left`)
  })

  socket.on('room-state', () => {
    const roomCode = socketToRoom.get(socket.id)
    if (!roomCode) return
    const room = rooms.get(roomCode)
    if (!room) return
    socket.emit('room-state', serializeRoomState(room))
  })

  socket.on('start-game', async () => {
    const roomCode = socketToRoom.get(socket.id)
    const playerId = socketToPlayerId.get(socket.id)
    if (!roomCode || !playerId) return
    const room = rooms.get(roomCode)
    if (!room) return

    const player = room.players.get(playerId)
    if (!player || !player.isHost) { socket.emit('error', { message: 'Only the host can start', code: 'NOT_HOST' }); return }
    if (room.status !== 'WAITING') { socket.emit('error', { message: 'Game already started', code: 'GAME_STARTED' }); return }

    room.status = 'PLAYING'
    room.currentQuestionIndex = -1
    room.players.forEach(p => { p.score = 0; p.streak = 0 })

    // Try AI question generation
    try {
      const aiResponse = await fetch(`${config.aiApiUrl}/api/ai/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: room.settings.category,
          difficulty: room.settings.difficulty,
          language: room.settings.language,
          count: room.settings.questionCount,
          timePerQuestion: room.settings.timePerQuestion,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json() as { questions: Array<{ text: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: string; explanation: string; category: string; difficulty: string }> }
        if (aiData.questions && aiData.questions.length > 0) {
          const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
          room.questions = aiData.questions.map((q, i) => ({
            index: i, text: q.text, options: [q.optionA, q.optionB, q.optionC, q.optionD],
            correctIndex: answerMap[q.correctAnswer.toUpperCase()] ?? 0,
            category: q.category || room.settings.category,
            difficulty: (q.difficulty || room.settings.difficulty) as Question['difficulty'],
          }))
          console.log(`[Room ${roomCode}] Generated ${room.questions.length} AI questions`)
        } else {
          room.questions = generateQuestions(room.settings.questionCount, room.settings.difficulty)
        }
      } else {
        room.questions = generateQuestions(room.settings.questionCount, room.settings.difficulty)
      }
    } catch {
      room.questions = generateQuestions(room.settings.questionCount, room.settings.difficulty)
      console.log(`[Room ${roomCode}] AI error, using sample questions`)
    }

    io.to(roomCode).emit('start-game', { state: serializeRoomState(room) })
    sendNextQuestion(room)
    console.log(`[Room ${roomCode}] Game started`)
  })

  socket.on('submit-answer', (data: { selectedIndex: number; responseTime: number }) => {
    const { selectedIndex, responseTime } = data
    const roomCode = socketToRoom.get(socket.id)
    const playerId = socketToPlayerId.get(socket.id)
    if (!roomCode || !playerId) return
    const room = rooms.get(roomCode)
    if (!room) return
    if (room.status !== 'QUESTION') { socket.emit('error', { message: 'Not in question phase', code: 'NOT_QUESTION_PHASE' }); return }

    const player = room.players.get(playerId)
    if (!player || !player.isConnected) return

    const currentAnswers = room.answers.get(String(room.currentQuestionIndex)) || []
    if (currentAnswers.some(a => a.playerId === playerId)) return

    const question = room.questions[room.currentQuestionIndex]
    const isCorrect = selectedIndex === question.correctIndex
    const pointsEarned = calculateScore(isCorrect, responseTime, room.settings.timePerQuestion, player.streak + (isCorrect ? 1 : 0))

    currentAnswers.push({ playerId, selectedIndex, responseTime, isCorrect, pointsEarned })
    room.answers.set(String(room.currentQuestionIndex), currentAnswers)

    socket.emit('answer-received', { questionIndex: room.currentQuestionIndex, selectedIndex, isCorrect, pointsEarned })

    if (allConnectedPlayersAnswered(room)) { clearQuestionTimer(room); revealAnswer(room) }
  })

  socket.on('disconnect', (reason) => {
    const roomCode = socketToRoom.get(socket.id)
    const playerId = socketToPlayerId.get(socket.id)
    console.log(`[Disconnect] ${socket.id} (${reason})`)
    if (!roomCode || !playerId) return
    const room = rooms.get(roomCode)
    if (!room) return
    const player = room.players.get(playerId)
    if (!player) return

    player.isConnected = false
    player.socketId = ''
    socketToRoom.delete(socket.id)
    socketToPlayerId.delete(socket.id)

    io.to(roomCode).emit('player-left', {
      player: { id: player.id, name: player.name, avatar: player.avatar, score: player.score, streak: player.streak, isHost: player.isHost, isConnected: false },
      message: `${player.name} disconnected`,
    })

    if (player.isHost) transferHost(room)

    const disconnectTimer = setTimeout(() => {
      const p = room.players.get(playerId)
      if (p && !p.isConnected) {
        room.players.delete(playerId)
        room.disconnectTimers.delete(playerId)
        if (room.players.size === 0) { clearQuestionTimer(room); rooms.delete(roomCode) }
      }
    }, config.disconnectRemovalTimeout)
    room.disconnectTimers.set(playerId, disconnectTimer)
    console.log(`[Room ${roomCode}] ${player.name} disconnected`)
  })

  socket.on('error', (error) => { console.error(`[Socket Error] ${socket.id}:`, error) })
})

// ============================================================
// Start Server
// ============================================================

httpServer.listen(config.port, () => {
  console.log(`[Quiz Service] Socket.io server running on port ${config.port}`)
  console.log(`[Quiz Service] Health check available at http://localhost:${config.port}/health`)
})

// ============================================================
// Graceful Shutdown
// ============================================================

function shutdown() {
  console.log('[Quiz Service] Shutting down...')
  rooms.forEach(room => {
    clearQuestionTimer(room)
    room.disconnectTimers.forEach(timer => clearTimeout(timer))
  })
  httpServer.close(() => { console.log('[Quiz Service] Server closed'); process.exit(0) })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
