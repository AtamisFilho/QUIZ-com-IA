import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const totalGames = await db.game.count()
    const activeGames = await db.game.count({ where: { status: { in: ['WAITING', 'PLAYING'] } } })
    const finishedGames = await db.game.count({ where: { status: 'FINISHED' } })
    const totalPlayers = await db.player.count()
    const totalQuestions = await db.question.count()

    const gamesByCategory = await db.game.groupBy({ by: ['category'], _count: true })
    const gamesByDifficulty = await db.game.groupBy({ by: ['difficulty'], _count: true })

    return NextResponse.json({
      totalGames,
      activeGames,
      finishedGames,
      totalPlayers,
      totalQuestions,
      gamesByCategory,
      gamesByDifficulty,
    })
  } catch (error) {
    console.error('[Admin Stats] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
