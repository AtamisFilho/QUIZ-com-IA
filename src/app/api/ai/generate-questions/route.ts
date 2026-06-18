import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CATEGORY_LABELS, VALID_CATEGORIES, VALID_DIFFICULTIES } from '@/lib/game-utils'

interface GeneratedQuestion {
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation: string
  category: string
  difficulty: string
}

const FALLBACK_QUESTIONS: GeneratedQuestion[] = [
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

async function generateQuestionsWithAI(
  category: string,
  difficulty: string,
  language: string,
  count: number
): Promise<GeneratedQuestion[]> {
  const ZAI = (await import('z-ai-web-dev-sdk')).default
  const zai = await ZAI.create()

  const categoryLabel = CATEGORY_LABELS[category] || category
  const difficultyLabel = difficulty === 'MIXED' ? 'mixed' : difficulty

  const systemPrompt = `You are a quiz question generator for a multiplayer party game. Generate exactly ${count} multiple-choice questions about ${categoryLabel} at ${difficultyLabel} difficulty level in ${language} language.

IMPORTANT: You MUST respond with ONLY a valid JSON array. No markdown, no code blocks, no extra text.

Each question must follow this exact format:
{
  "text": "The question text",
  "optionA": "First option",
  "optionB": "Second option",
  "optionC": "Third option",
  "optionD": "Fourth option",
  "correctAnswer": "A",
  "explanation": "Brief explanation",
  "category": "${category}",
  "difficulty": "${difficulty === 'MIXED' ? 'MEDIUM' : difficulty}"
}

Rules:
- correctAnswer must be exactly: "A", "B", "C", or "D"
- Only one option should be correct
- Make questions fun and interesting
- Explanations should be 1-2 sentences
- Do not repeat questions
- All 4 options must be plausible but only one correct
- Output must be a valid JSON array with no surrounding text`

  const userPrompt = `Generate ${count} quiz questions about ${categoryLabel} in ${language} at ${difficultyLabel} difficulty. Output ONLY the JSON array.`

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('AI returned empty content')

  return parseAIResponse(content, category, difficulty)
}

function parseAIResponse(content: string, category: string, difficulty: string): GeneratedQuestion[] {
  let jsonStr = content.trim()
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim()
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
  if (arrayMatch) jsonStr = arrayMatch[0]

  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) throw new Error('Not an array')

    return parsed.map((q: Record<string, unknown>, index: number) => {
      if (!q.text || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctAnswer) {
        throw new Error(`Question ${index} missing fields`)
      }
      const answer = String(q.correctAnswer).toUpperCase()
      if (!['A', 'B', 'C', 'D'].includes(answer)) {
        throw new Error(`Question ${index} invalid correctAnswer`)
      }
      return {
        text: String(q.text),
        optionA: String(q.optionA),
        optionB: String(q.optionB),
        optionC: String(q.optionC),
        optionD: String(q.optionD),
        correctAnswer: answer,
        explanation: q.explanation ? String(q.explanation) : 'No explanation provided.',
        category: String(q.category || category),
        difficulty: String(q.difficulty || difficulty),
      }
    })
  } catch (parseError) {
    throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown'}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, difficulty, language, count, timePerQuestion, gameId } = body

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category` }, { status: 400 })
    }
    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: `Invalid difficulty` }, { status: 400 })
    }
    if (!language) {
      return NextResponse.json({ error: 'language is required' }, { status: 400 })
    }

    const parsedCount = Number(count)
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 50) {
      return NextResponse.json({ error: 'count must be 1-50' }, { status: 400 })
    }

    const parsedTimePerQuestion = Number(timePerQuestion) || 30

    let questions: GeneratedQuestion[] = []
    let usedAI = false

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        console.log(`[AI Generate] Attempt ${attempt + 1} for ${category}/${difficulty}/${language}`)
        questions = await generateQuestionsWithAI(category, difficulty, language, parsedCount)
        usedAI = true
        break
      } catch (aiError) {
        console.error(`[AI Generate] Attempt ${attempt + 1} failed:`, aiError)
      }
    }

    if (!usedAI || questions.length === 0) {
      questions = FALLBACK_QUESTIONS.slice(0, parsedCount)
      questions = questions.map((q) => ({
        ...q,
        category,
        difficulty: difficulty === 'MIXED' ? q.difficulty : difficulty,
      }))
    }

    if (questions.length > parsedCount) {
      questions = questions.slice(0, parsedCount)
    }

    if (gameId) {
      const questionRecords = questions.map((q, index) => ({
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: index,
        timeLimit: parsedTimePerQuestion,
        gameId,
      }))
      await db.question.createMany({ data: questionRecords })
    }

    return NextResponse.json({ questions, generatedBy: usedAI ? 'ai' : 'fallback', count: questions.length })
  } catch (error) {
    console.error('[AI Generate] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
