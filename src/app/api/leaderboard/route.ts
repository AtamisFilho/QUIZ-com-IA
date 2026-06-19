import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 10, 1), 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    const period = searchParams.get('period') || 'all'

    // Build date filter
    let dateFilter: Date | undefined
    if (period === 'week') {
      dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - 7)
    } else if (period === 'today') {
      dateFilter = new Date()
      dateFilter.setHours(0, 0, 0, 0)
    }

    const whereClause: Record<string, unknown> = {
      game: {
        status: 'FINISHED',
        ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
      },
    }

    const players = await db.gamePlayer.findMany({
      where: whereClause,
      select: {
        name: true,
        score: true,
        streak: true,
        isHost: true,
        userId: true,
        game: {
          select: {
            code: true,
            category: true,
            difficulty: true,
            createdAt: true,
          },
        },
      },
      orderBy: { score: 'desc' },
    })

    const playerMap = new Map<string, {
      name: string
      userId: string | null
      totalScore: number
      bestScore: number
      maxStreak: number
      gamesPlayed: number
      gamesWon: number
    }>()

    for (const p of players) {
      const key = p.name
      const existing = playerMap.get(key)
      if (existing) {
        existing.totalScore += p.score
        existing.bestScore = Math.max(existing.bestScore, p.score)
        existing.maxStreak = Math.max(existing.maxStreak, p.streak)
        existing.gamesPlayed += 1
        if (p.isHost) existing.gamesWon += 1
      } else {
        playerMap.set(key, {
          name: p.name,
          userId: p.userId,
          totalScore: p.score,
          bestScore: p.score,
          maxStreak: p.streak,
          gamesPlayed: 1,
          gamesWon: p.isHost ? 1 : 0,
        })
      }
    }

    // Get user profiles for those with userId
    const userIds = Array.from(playerMap.values())
      .map(p => p.userId)
      .filter((id): id is string => !!id)

    const profiles = userIds.length > 0
      ? await db.userProfile.findMany({
          where: { userId: { in: userIds } },
          select: {
            userId: true,
            avatarEmoji: true,
            avatarColor: true,
            level: true,
            totalWins: true,
            totalGames: true,
          },
        })
      : []

    const profileMap = new Map(profiles.map(p => [p.userId, p]))

    const leaderboard = Array.from(playerMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(offset, offset + limit)
      .map((p, index) => {
        const profile = p.userId ? profileMap.get(p.userId) : null
        return {
          rank: offset + index + 1,
          name: p.name,
          avatarEmoji: profile?.avatarEmoji || '🎮',
          avatarColor: profile?.avatarColor || 'purple',
          level: profile?.level || 1,
          totalScore: p.totalScore,
          gamesPlayed: p.gamesPlayed,
          winRate: p.gamesPlayed > 0
            ? Math.round((p.gamesWon / p.gamesPlayed) * 100)
            : 0,
          bestStreak: p.maxStreak,
        }
      })

    return NextResponse.json({ leaderboard, total: playerMap.size, limit, offset, period })
  } catch (error) {
    console.error('[Leaderboard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
