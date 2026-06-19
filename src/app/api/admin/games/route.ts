import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const totalGames = await db.game.count()
    const activeGames = await db.game.count({ where: { status: { in: ['WAITING', 'PLAYING'] } } })
    const totalPlayers = await db.gamePlayer.count()
    const totalQuestions = await db.question.count()

    const recentGames = await db.game.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { players: true },
    })

    return NextResponse.json({ totalGames, activeGames, totalPlayers, totalQuestions, recentGames })
  } catch (error) {
    console.error('[Admin Games] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
