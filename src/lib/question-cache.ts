import { db } from '@/lib/db'

export async function getQuestionsFromCache(
  category: string,
  difficulty: string,
  language: string,
  count: number
) {
  // Try to get from cache
  const cached = await db.questionCache.findMany({
    where: {
      category,
      difficulty,
      language,
      qualityScore: { gte: 0.5 },
    },
    orderBy: [
      { timesUsed: 'asc' }, // Prefer less-used questions
      { qualityScore: 'desc' },
    ],
    take: count,
  })

  if (cached.length >= count) {
    // Mark as used
    await Promise.all(
      cached.map(q =>
        db.questionCache.update({
          where: { id: q.id },
          data: { timesUsed: { increment: 1 } },
        })
      )
    )

    return cached.map(q => ({
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || undefined,
      category: q.category,
      difficulty: q.difficulty,
    }))
  }

  return null // Cache miss
}

export async function saveQuestionsToCache(
  questions: Array<{
    text: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correctAnswer: string
    explanation?: string
    category: string
    difficulty: string
  }>,
  language: string
) {
  await db.questionCache.createMany({
    data: questions.map(q => ({
      ...q,
      language,
      source: 'ai',
    })),
    skipDuplicates: true,
  })
}
