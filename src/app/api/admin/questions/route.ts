import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    const questions = await db.question.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: { game: { select: { code: true, category: true } } },
    })

    const total = await db.question.count()

    return NextResponse.json({ questions, total, limit, offset })
  } catch (error) {
    console.error('[Admin Questions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
