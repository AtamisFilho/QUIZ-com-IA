import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const totalGames = await db.game.count()
    const activeGames = await db.game.count({ where: { status: { in: ['WAITING', 'PLAYING'] } } })
    const finishedGames = await db.game.count({ where: { status: 'FINISHED' } })
    const totalPlayers = await db.gamePlayer.count()
    const totalQuestions = await db.question.count()

    // GroupBy might not work well on SQLite, use raw aggregation instead
    const games = await db.game.findMany({
      select: { category: true, difficulty: true },
    })

    const gamesByCategory: Record<string, number> = {}
    const gamesByDifficulty: Record<string, number> = {}
    for (const g of games) {
      gamesByCategory[g.category] = (gamesByCategory[g.category] || 0) + 1
      gamesByDifficulty[g.difficulty] = (gamesByDifficulty[g.difficulty] || 0) + 1
    }

    const totalUsers = await db.user.count()

    return NextResponse.json({
      totalGames,
      activeGames,
      finishedGames,
      totalPlayers,
      totalUsers,
      totalQuestions,
      gamesByCategory: Object.entries(gamesByCategory).map(([category, count]) => ({ category, _count: count })),
      gamesByDifficulty: Object.entries(gamesByDifficulty).map(([difficulty, count]) => ({ difficulty, _count: count })),
    })
  } catch (error) {
    console.error('[Admin Stats] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
