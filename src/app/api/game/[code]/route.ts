import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const game = await db.game.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: true,
        questions: { orderBy: { order: 'asc' } },
      },
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    return NextResponse.json({
      code: game.code,
      status: game.status,
      category: game.category,
      difficulty: game.difficulty,
      language: game.language,
      maxPlayers: game.maxPlayers,
      questionCount: game.questionCount,
      timePerQuestion: game.timePerQuestion,
      currentQuestionIndex: game.currentQuestionIndex,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak,
        isHost: p.isHost,
        isConnected: p.isConnected,
      })),
      questions: game.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: [q.optionA, q.optionB, q.optionC, q.optionD],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: q.order,
      })),
    })
  } catch (error) {
    console.error('[Game Get] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
