import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { VALID_CATEGORIES } from '@/lib/game-utils'
import { getQuestionsFromCache, saveQuestionsToCache } from '@/lib/question-cache'

const CATEGORIES = VALID_CATEGORIES // 10 categories
const DAILY_QUESTION_COUNT = 10
const DAILY_TIME_PER_QUESTION = 20

/**
 * GET /api/daily - Get today's daily challenge
 * Returns: { date, category, difficulty, language, questions, completed, bestScore }
 *
 * Logic:
 * 1. Check if DailyChallenge exists for today (date = YYYY-MM-DD)
 * 2. If not, create one with a deterministic seed based on the date
 * 3. Generate questions using the seed (or AI if no cache)
 * 4. If userId provided (from query param), include their DailyChallengeResult
 * 5. Return challenge data with user's result if available
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined
    const language = searchParams.get('language') || 'pt-BR'

    const today = new Date().toISOString().split('T')[0]
    const dayOfYear = getDayOfYear(new Date())

    // Determine category and difficulty based on the day
    const categoryIndex = dayOfYear % CATEGORIES.length
    const category = CATEGORIES[categoryIndex]
    const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon, ...
    const difficulty: 'MEDIUM' | 'HARD' = [1, 3, 5, 0].includes(dayOfWeek) ? 'MEDIUM' : 'HARD' // Mon/Wed/Fri/Sun = MEDIUM, Tue/Thu/Sat = HARD

    // Deterministic seed based on date
    const seed = hashDate(today)

    // Check if today's challenge already exists
    let challenge = await db.dailyChallenge.findUnique({
      where: { date: today },
    })

    if (!challenge) {
      // Create today's challenge
      challenge = await db.dailyChallenge.create({
        data: {
          date: today,
          category,
          difficulty,
          language,
          seed,
          active: true,
        },
      })
    }

    // Generate or retrieve questions
    let questions = await getQuestionsFromCache(category, difficulty, language, DAILY_QUESTION_COUNT)

    if (!questions || questions.length < DAILY_QUESTION_COUNT) {
      // Try AI generation
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
            language,
            count: DAILY_QUESTION_COUNT,
            timePerQuestion: DAILY_TIME_PER_QUESTION,
          }),
        })

        if (aiResponse.ok) {
          const aiData = await aiResponse.json() as { questions: Array<{
            text: string
            optionA: string
            optionB: string
            optionC: string
            optionD: string
            correctAnswer: string
            explanation?: string
            category: string
            difficulty: string
          }> }

          if (aiData.questions && aiData.questions.length > 0) {
            questions = aiData.questions.slice(0, DAILY_QUESTION_COUNT)
            // Save to cache for future use
            await saveQuestionsToCache(aiData.questions, language)
          }
        }
      } catch (aiError) {
        console.error('[Daily Challenge] AI generation failed:', aiError)
      }
    }

    // Fallback questions if nothing worked
    if (!questions || questions.length === 0) {
      questions = generateFallbackQuestions(category, difficulty)
    }

    // Transform questions for the client
    const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
    const transformedQuestions = questions.slice(0, DAILY_QUESTION_COUNT).map((q, i) => ({
      index: i,
      text: q.text,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctIndex: answerMap[q.correctAnswer?.toUpperCase()] ?? 0,
      category: q.category || category,
      difficulty: q.difficulty || difficulty,
      explanation: q.explanation,
    }))

    // Check if user already completed today
    let userResult = null
    if (userId) {
      userResult = await db.dailyChallengeResult.findUnique({
        where: {
          userId_challengeId: {
            userId,
            challengeId: challenge.id,
          },
        },
      })
    }

    // Get total participants for today
    const participantCount = await db.dailyChallengeResult.count({
      where: { challengeId: challenge.id },
    })

    // Get user's rank if they completed it
    let userRank = null
    if (userResult) {
      const higherScores = await db.dailyChallengeResult.count({
        where: {
          challengeId: challenge.id,
          score: { gt: userResult.score },
        },
      })
      userRank = higherScores + 1
    }

    return NextResponse.json({
      date: today,
      category: challenge.category,
      difficulty: challenge.difficulty,
      language: challenge.language,
      questions: transformedQuestions,
      timePerQuestion: DAILY_TIME_PER_QUESTION,
      completed: !!userResult,
      bestScore: userResult?.score || null,
      correctCount: userResult?.correctCount || null,
      totalCount: userResult?.totalCount || null,
      timeTakenMs: userResult?.timeTakenMs || null,
      userRank,
      participantCount,
    })
  } catch (error) {
    console.error('[Daily Challenge] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

function hashDate(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

function generateFallbackQuestions(category: string, difficulty: string): Array<{
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation: string
  category: string
  difficulty: string
}> {
  const fallbacks: Record<string, Array<{
    text: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    correctAnswer: string
    explanation: string
    category: string
    difficulty: string
  }>> = {
    science: [
      { text: 'What is the chemical symbol for water?', optionA: 'H2O', optionB: 'CO2', optionC: 'NaCl', optionD: 'O2', correctAnswer: 'A', explanation: 'Water is composed of two hydrogen atoms and one oxygen atom.', category: 'science', difficulty: 'MEDIUM' },
      { text: 'Which planet is known as the Red Planet?', optionA: 'Venus', optionB: 'Mars', optionC: 'Jupiter', optionD: 'Saturn', correctAnswer: 'B', explanation: 'Mars appears red due to iron oxide on its surface.', category: 'science', difficulty: 'MEDIUM' },
      { text: 'What is the speed of light approximately?', optionA: '300,000 km/s', optionB: '150,000 km/s', optionC: '500,000 km/s', optionD: '1,000,000 km/s', correctAnswer: 'A', explanation: 'Light travels at approximately 300,000 km/s.', category: 'science', difficulty: 'HARD' },
      { text: 'Which element has the atomic number 1?', optionA: 'Helium', optionB: 'Hydrogen', optionC: 'Lithium', optionD: 'Carbon', correctAnswer: 'B', explanation: 'Hydrogen has atomic number 1.', category: 'science', difficulty: 'MEDIUM' },
      { text: 'What is the hardest natural substance?', optionA: 'Gold', optionB: 'Iron', optionC: 'Diamond', optionD: 'Platinum', correctAnswer: 'C', explanation: 'Diamond is the hardest natural substance.', category: 'science', difficulty: 'MEDIUM' },
      { text: 'Who discovered penicillin?', optionA: 'Marie Curie', optionB: 'Alexander Fleming', optionC: 'Louis Pasteur', optionD: 'Joseph Lister', correctAnswer: 'B', explanation: 'Alexander Fleming discovered penicillin in 1928.', category: 'science', difficulty: 'HARD' },
      { text: 'What is the boiling point of water at sea level?', optionA: '90°C', optionB: '100°C', optionC: '110°C', optionD: '120°C', correctAnswer: 'B', explanation: 'Water boils at 100°C at sea level.', category: 'science', difficulty: 'MEDIUM' },
      { text: 'Which gas do plants absorb from the atmosphere?', optionA: 'Oxygen', optionB: 'Nitrogen', optionC: 'Carbon Dioxide', optionD: 'Hydrogen', correctAnswer: 'C', explanation: 'Plants absorb CO2 during photosynthesis.', category: 'science', difficulty: 'MEDIUM' },
      { text: 'What is the largest organ in the human body?', optionA: 'Heart', optionB: 'Liver', optionC: 'Brain', optionD: 'Skin', correctAnswer: 'D', explanation: 'The skin is the largest organ.', category: 'science', difficulty: 'HARD' },
      { text: 'What is the chemical symbol for gold?', optionA: 'Go', optionB: 'Gd', optionC: 'Au', optionD: 'Ag', correctAnswer: 'C', explanation: 'Gold has the symbol Au from Latin aurum.', category: 'science', difficulty: 'HARD' },
    ],
    general: [
      { text: 'What is the capital of France?', optionA: 'London', optionB: 'Berlin', optionC: 'Paris', optionD: 'Madrid', correctAnswer: 'C', explanation: 'Paris is the capital of France.', category: 'general', difficulty: 'MEDIUM' },
      { text: 'Which country has the most population?', optionA: 'USA', optionB: 'India', optionC: 'China', optionD: 'Indonesia', correctAnswer: 'B', explanation: 'India has the largest population.', category: 'general', difficulty: 'HARD' },
      { text: 'What year was the first iPhone released?', optionA: '2005', optionB: '2006', optionC: '2007', optionD: '2008', correctAnswer: 'C', explanation: 'The first iPhone was released in 2007.', category: 'general', difficulty: 'MEDIUM' },
      { text: 'What is the smallest country in the world?', optionA: 'Monaco', optionB: 'Vatican City', optionC: 'San Marino', optionD: 'Liechtenstein', correctAnswer: 'B', explanation: 'Vatican City is the smallest country.', category: 'general', difficulty: 'HARD' },
      { text: 'What is the largest ocean on Earth?', optionA: 'Atlantic', optionB: 'Indian', optionC: 'Arctic', optionD: 'Pacific', correctAnswer: 'D', explanation: 'The Pacific Ocean is the largest.', category: 'general', difficulty: 'MEDIUM' },
      { text: 'In which continent is Brazil located?', optionA: 'North America', optionB: 'Europe', optionC: 'South America', optionD: 'Africa', correctAnswer: 'C', explanation: 'Brazil is in South America.', category: 'general', difficulty: 'MEDIUM' },
      { text: 'What is the longest river in the world?', optionA: 'Amazon', optionB: 'Nile', optionC: 'Mississippi', optionD: 'Yangtze', correctAnswer: 'B', explanation: 'The Nile is the longest river.', category: 'general', difficulty: 'HARD' },
      { text: 'Who painted the Mona Lisa?', optionA: 'Van Gogh', optionB: 'Picasso', optionC: 'Da Vinci', optionD: 'Michelangelo', correctAnswer: 'C', explanation: 'Leonardo da Vinci painted the Mona Lisa.', category: 'general', difficulty: 'MEDIUM' },
      { text: 'Which planet is known as the Red Planet?', optionA: 'Venus', optionB: 'Mars', optionC: 'Jupiter', optionD: 'Saturn', correctAnswer: 'B', explanation: 'Mars is the Red Planet.', category: 'general', difficulty: 'MEDIUM' },
      { text: 'What is the largest mammal?', optionA: 'Elephant', optionB: 'Blue Whale', optionC: 'Giraffe', optionD: 'Hippopotamus', correctAnswer: 'B', explanation: 'The Blue Whale is the largest mammal.', category: 'general', difficulty: 'HARD' },
    ],
  }

  // Return category-specific or general fallbacks
  const pool = fallbacks[category] || fallbacks.science
  return pool.map(q => ({ ...q, category, difficulty }))
}
