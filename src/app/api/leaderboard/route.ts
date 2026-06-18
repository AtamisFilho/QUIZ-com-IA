import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    const players = await db.player.findMany({
      where: { game: { status: 'FINISHED' } },
      select: {
        name: true,
        score: true,
        streak: true,
        isHost: true,
        game: { select: { code: true, category: true, difficulty: true } },
      },
      orderBy: { score: 'desc' },
    })

    const playerMap = new Map<string, {
      name: string; totalScore: number; bestScore: number;
      maxStreak: number; gamesPlayed: number; gamesHosted: number;
    }>()

    for (const p of players) {
      const existing = playerMap.get(p.name)
      if (existing) {
        existing.totalScore += p.score
        existing.bestScore = Math.max(existing.bestScore, p.score)
        existing.maxStreak = Math.max(existing.maxStreak, p.streak)
        existing.gamesPlayed += 1
        if (p.isHost) existing.gamesHosted += 1
      } else {
        playerMap.set(p.name, {
          name: p.name, totalScore: p.score, bestScore: p.score,
          maxStreak: p.streak, gamesPlayed: 1, gamesHosted: p.isHost ? 1 : 0,
        })
      }
    }

    const leaderboard = Array.from(playerMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(offset, offset + limit)

    return NextResponse.json({ leaderboard, total: playerMap.size, limit, offset })
  } catch (error) {
    console.error('[Leaderboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
