import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const body = await request.json()
    const { players } = body as {
      players: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean }>
    }

    const game = await db.game.findUnique({
      where: { code: code.toUpperCase() },
      include: { players: true },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Update game status
    await db.game.update({
      where: { id: game.id },
      data: { status: 'FINISHED' },
    })

    // Update player scores
    if (players && Array.isArray(players)) {
      for (const p of players) {
        const existingPlayer = game.players.find(ep => ep.id === p.id)
        if (existingPlayer) {
          await db.player.update({
            where: { id: p.id },
            data: { score: p.score, streak: p.streak },
          })
        }
      }
    }

    // Create game stats
    const totalScore = players?.reduce((sum: number, p: { score: number }) => sum + p.score, 0) ?? 0
    const avgScore = players?.length ? Math.round(totalScore / players.length) : 0
    const perfectScores = players?.filter((p: { score: number }) => p.score > 0).length ?? 0

    await db.gameStats.upsert({
      where: { gameId: game.id },
      create: {
        totalQuestions: game.questionCount,
        averageResponseTimeMs: avgScore,
        perfectScores,
        gameId: game.id,
      },
      update: {
        totalQuestions: game.questionCount,
        averageResponseTimeMs: avgScore,
        perfectScores,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Game Finish] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
