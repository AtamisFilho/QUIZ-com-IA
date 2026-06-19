import { NextRequest, NextResponse } from 'next/server'
import { VALID_CATEGORIES, VALID_DIFFICULTIES } from '@/lib/game-utils'

const FALLBACK_QUESTIONS = [
  { text: "What is the chemical symbol for water?", optionA: "H2O", optionB: "CO2", optionC: "NaCl", optionD: "O2", correctAnswer: "A", explanation: "Water is composed of two hydrogen atoms and one oxygen atom.", category: "science", difficulty: "EASY" },
  { text: "Which planet is known as the Red Planet?", optionA: "Venus", optionB: "Mars", optionC: "Jupiter", optionD: "Saturn", correctAnswer: "B", explanation: "Mars appears red due to iron oxide on its surface.", category: "science", difficulty: "EASY" },
  { text: "In what year did World War II end?", optionA: "1943", optionB: "1944", optionC: "1945", optionD: "1946", correctAnswer: "C", explanation: "WWII ended in 1945 with the surrender of Germany and Japan.", category: "history", difficulty: "EASY" },
  { text: "What is the largest ocean on Earth?", optionA: "Atlantic", optionB: "Indian", optionC: "Arctic", optionD: "Pacific", correctAnswer: "D", explanation: "The Pacific Ocean is the largest and deepest ocean.", category: "geography", difficulty: "EASY" },
  { text: "Who painted the Mona Lisa?", optionA: "Michelangelo", optionB: "Leonardo da Vinci", optionC: "Raphael", optionD: "Donatello", correctAnswer: "B", explanation: "Leonardo da Vinci painted the Mona Lisa between 1503 and 1519.", category: "art", difficulty: "EASY" },
  { text: "Which element has the atomic number 79?", optionA: "Silver", optionB: "Platinum", optionC: "Gold", optionD: "Copper", correctAnswer: "C", explanation: "Gold (Au) has atomic number 79.", category: "science", difficulty: "MEDIUM" },
  { text: "What is the capital of Australia?", optionA: "Sydney", optionB: "Melbourne", optionC: "Canberra", optionD: "Brisbane", correctAnswer: "C", explanation: "Canberra is the capital, not Sydney as many assume.", category: "geography", difficulty: "MEDIUM" },
  { text: "Which composer wrote the Moonlight Sonata?", optionA: "Mozart", optionB: "Beethoven", optionC: "Bach", optionD: "Chopin", correctAnswer: "B", explanation: "Beethoven composed the Moonlight Sonata in 1801.", category: "music", difficulty: "MEDIUM" },
  { text: "What programming language was created by Brendan Eich in 1995?", optionA: "Python", optionB: "Java", optionC: "JavaScript", optionD: "C++", correctAnswer: "C", explanation: "Brendan Eich created JavaScript at Netscape.", category: "technology", difficulty: "MEDIUM" },
  { text: "Which novel begins with 'Call me Ishmael'?", optionA: "The Great Gatsby", optionB: "Moby-Dick", optionC: "1984", optionD: "Pride and Prejudice", correctAnswer: "B", explanation: "Moby-Dick by Herman Melville.", category: "literature", difficulty: "MEDIUM" },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, difficulty, language, questionCount, timePerQuestion } = body

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
    }

    const parsedCount = Number(questionCount) || 10
    if (parsedCount < 1 || parsedCount > 50) {
      return NextResponse.json({ error: 'questionCount must be 1-50' }, { status: 400 })
    }

    const parsedTime = Number(timePerQuestion) || 20

    // Try to generate questions via AI endpoint internally
    let questions = null
    let generatedBy = 'fallback'

    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      const aiResponse = await fetch(`${baseUrl}/api/ai/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          difficulty,
          language: language || 'pt-BR',
          count: parsedCount,
          timePerQuestion: parsedTime,
        }),
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        if (aiData.questions && aiData.questions.length > 0) {
          questions = aiData.questions
          generatedBy = aiData.generatedBy || 'ai'
        }
      }
    } catch (aiError) {
      console.error('[Solo Start] AI generation failed, using fallback:', aiError)
    }

    // Fallback questions
    if (!questions || questions.length === 0) {
      questions = FALLBACK_QUESTIONS.slice(0, parsedCount).map((q) => ({
        ...q,
        category,
        difficulty: difficulty === 'MIXED' ? q.difficulty : difficulty,
      }))
      generatedBy = 'fallback'
    }

    if (questions.length > parsedCount) {
      questions = questions.slice(0, parsedCount)
    }

    const gameId = `solo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`

    return NextResponse.json({
      gameId,
      questions,
      generatedBy,
      count: questions.length,
      timePerQuestion: parsedTime,
    })
  } catch (error) {
    console.error('[Solo Start] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
