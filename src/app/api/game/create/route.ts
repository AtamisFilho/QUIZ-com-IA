import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateGameCode, VALID_CATEGORIES, VALID_DIFFICULTIES } from '@/lib/game-utils'

const AVATARS = ['🎮','🎲','🎯','🏆','⚡','🔥','🌟','💎','🚀','🎪','🦊','🐱','🐶','🦁','🐻','🐼','🦄','🐲','🦅','🐬','🎭','🎨','🎵','🎸','🌸','🍀','🌈','⭐','🧠','💪','🤖','👾','🧙','🧛','🦸','🥷','👽','🤠','😈','💀']

function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

interface CreateGameBody {
  hostName: string
  settings?: {
    category: string
    difficulty: string
    language: string
    maxPlayers: number
    questionCount: number
    timePerQuestion: number
  }
  category?: string
  difficulty?: string
  language?: string
  maxPlayers?: number
  questionCount?: number
  timePerQuestion?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateGameBody = await request.json()
    const { hostName } = body

    const category = body.settings?.category ?? body.category
    const difficulty = body.settings?.difficulty ?? body.difficulty
    const language = body.settings?.language ?? body.language
    const maxPlayers = body.settings?.maxPlayers ?? body.maxPlayers
    const questionCount = body.settings?.questionCount ?? body.questionCount
    const timePerQuestion = body.settings?.timePerQuestion ?? body.timePerQuestion

    if (!hostName || typeof hostName !== 'string' || hostName.trim().length === 0) {
      return NextResponse.json({ error: 'hostName is required' }, { status: 400 })
    }
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
    }
    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` }, { status: 400 })
    }
    if (!language || typeof language !== 'string') {
      return NextResponse.json({ error: 'language is required' }, { status: 400 })
    }

    const parsedMaxPlayers = Number(maxPlayers)
    if (isNaN(parsedMaxPlayers) || parsedMaxPlayers < 2 || parsedMaxPlayers > 20) {
      return NextResponse.json({ error: 'maxPlayers must be between 2 and 20' }, { status: 400 })
    }
    const parsedQuestionCount = Number(questionCount)
    if (isNaN(parsedQuestionCount) || parsedQuestionCount < 3 || parsedQuestionCount > 50) {
      return NextResponse.json({ error: 'questionCount must be between 3 and 50' }, { status: 400 })
    }
    const parsedTimePerQuestion = Number(timePerQuestion)
    if (isNaN(parsedTimePerQuestion) || parsedTimePerQuestion < 5 || parsedTimePerQuestion > 120) {
      return NextResponse.json({ error: 'timePerQuestion must be between 5 and 120 seconds' }, { status: 400 })
    }

    let gameCode = ''
    let attempts = 0
    while (attempts < 10) {
      const candidate = generateGameCode()
      const existing = await db.game.findUnique({ where: { code: candidate } })
      if (!existing) { gameCode = candidate; break }
      attempts++
    }
    if (!gameCode) {
      return NextResponse.json({ error: 'Failed to generate unique game code' }, { status: 500 })
    }

    const hostAvatar = randomAvatar()
    const game = await db.game.create({
      data: {
        code: gameCode,
        status: 'WAITING',
        category,
        difficulty,
        language,
        maxPlayers: parsedMaxPlayers,
        questionCount: parsedQuestionCount,
        timePerQuestion: parsedTimePerQuestion,
        currentQuestionIndex: 0,
        players: {
          create: { name: hostName.trim(), avatar: hostAvatar, isHost: true, isConnected: false },
        },
      },
      include: { players: true },
    })

    const hostPlayer = game.players[0]

    return NextResponse.json({
      gameCode: game.code,
      gameId: game.id,
      playerId: hostPlayer.id,
      avatar: hostPlayer.avatar,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak,
        isHost: p.isHost,
        isConnected: p.isConnected,
      })),
    }, { status: 201 })
  } catch (error) {
    console.error('[Game Create] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
