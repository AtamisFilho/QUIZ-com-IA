import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await request.json()
    const { playerId } = body

    if (!playerId) {
      return NextResponse.json({ error: 'playerId is required' }, { status: 400 })
    }

    const game = await db.game.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const player = game.players.find(p => p.id === playerId)
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    if (!player.isHost) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 })
    }

    if (game.status !== 'WAITING') {
      return NextResponse.json({ error: 'Game already started' }, { status: 400 })
    }

    await db.game.update({
      where: { id: game.id },
      data: { status: 'PLAYING' },
    })

    return NextResponse.json({ success: true, status: 'PLAYING' })
  } catch (error) {
    console.error('[Game Start] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
