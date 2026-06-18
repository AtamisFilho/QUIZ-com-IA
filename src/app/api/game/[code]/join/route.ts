import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const AVATARS = ['🎮','🎲','🎯','🏆','⚡','🔥','🌟','💎','🚀','🎪','🦊','🐱','🐶','🦁','🐻','🐼','🦄','🐲','🦅','🐬','🎭','🎨','🎵','🎸','🌸','🍀','🌈','⭐','🧠','💪','🤖','👾','🧙','🧛','🦸','🥷','👽','🤠','😈','💀']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await request.json()
    const { playerName } = body

    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return NextResponse.json({ error: 'playerName is required' }, { status: 400 })
    }

    const game = await db.game.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game already in progress' }, { status: 400 })
    }

    const connectedCount = game.players.filter(p => p.isConnected).length
    if (connectedCount >= game.maxPlayers) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 })
    }

    const nameExists = game.players.some(
      p => p.name.toLowerCase() === playerName.trim().toLowerCase() && p.isConnected
    )
    if (nameExists) {
      return NextResponse.json({ error: 'Name already taken' }, { status: 400 })
    }

    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)]

    const player = await db.player.create({
      data: {
        name: playerName.trim(),
        avatar,
        isHost: false,
        isConnected: false,
        gameId: game.id,
      },
    })

    const updatedGame = await db.game.findUnique({
      where: { id: game.id },
      include: { players: true },
    })

    return NextResponse.json({
      playerId: player.id,
      avatar: player.avatar,
      players: updatedGame?.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak,
        isHost: p.isHost,
        isConnected: p.isConnected,
      })) ?? [],
    })
  } catch (error) {
    console.error('[Game Join] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
