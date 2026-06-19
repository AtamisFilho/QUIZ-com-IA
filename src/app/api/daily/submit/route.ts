import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateUserGameStats, addXpToUser, checkAchievements, XP_REWARDS } from '@/lib/profile-utils'

/**
 * POST /api/daily/submit
 * Body: { userId, score, correctCount, totalCount, timeTakenMs }
 *
 * Logic:
 * 1. Get today's challenge
 * 2. Check if user already submitted today (return error if so)
 * 3. Create DailyChallengeResult
 * 4. Update UserProfile: increment dailyStreak if lastDailyAt was yesterday, reset if older
 * 5. Add XP rewards
 * 6. Check achievements
 * 7. Return: { result, profile, newAchievements }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, score, correctCount, totalCount, timeTakenMs } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const parsedScore = Number(score) || 0
    const parsedCorrect = Number(correctCount) || 0
    const parsedTotal = Number(totalCount) || 0
    const parsedTime = Number(timeTakenMs) || 0

    // Get today's date
    const today = new Date().toISOString().split('T')[0]

    // Get today's challenge
    const challenge = await db.dailyChallenge.findUnique({
      where: { date: today },
    })

    if (!challenge) {
      return NextResponse.json({ error: 'No daily challenge found for today' }, { status: 404 })
    }

    // Check if user already submitted today
    const existingResult = await db.dailyChallengeResult.findUnique({
      where: {
        userId_challengeId: {
          userId,
          challengeId: challenge.id,
        },
      },
    })

    if (existingResult) {
      return NextResponse.json(
        { error: 'You have already completed today\'s challenge', result: existingResult },
        { status: 409 }
      )
    }

    // Create the result
    const result = await db.dailyChallengeResult.create({
      data: {
        userId,
        challengeId: challenge.id,
        score: parsedScore,
        correctCount: parsedCorrect,
        totalCount: parsedTotal,
        timeTakenMs: parsedTime,
      },
    })

    // Update daily streak
    let updatedProfile = null
    let newAchievements: Array<{ id: string; key: string; name: string; icon: string; xpReward: number }> = []

    try {
      const profile = await db.userProfile.findUnique({ where: { userId } })
      if (profile) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const lastDailyStr = profile.lastDailyAt?.toISOString().split('T')[0]

        let newStreak = profile.dailyStreak

        if (lastDailyStr === yesterdayStr) {
          // Played yesterday, increment streak
          newStreak += 1
        } else if (lastDailyStr !== today) {
          // Last play was before yesterday, reset streak to 1
          newStreak = 1
        }
        // If lastDailyStr === today, keep current streak (shouldn't happen due to duplicate check)

        updatedProfile = await db.userProfile.update({
          where: { userId },
          data: {
            dailyStreak: newStreak,
            lastDailyAt: new Date(),
          },
        })
      }
    } catch (streakError) {
      console.error('[Daily Submit] Streak update failed:', streakError)
    }

    // Add XP rewards
    let totalXpEarned = 0
    try {
      // Base daily challenge XP
      await addXpToUser(userId, XP_REWARDS.DAILY_CHALLENGE)
      totalXpEarned += XP_REWARDS.DAILY_CHALLENGE

      // XP for correct answers
      if (parsedCorrect > 0) {
        const correctXp = parsedCorrect * XP_REWARDS.CORRECT_ANSWER
        await addXpToUser(userId, correctXp)
        totalXpEarned += correctXp
      }

      // Perfect game bonus
      if (parsedCorrect === parsedTotal && parsedTotal > 0) {
        await addXpToUser(userId, XP_REWARDS.GAME_WIN)
        totalXpEarned += XP_REWARDS.GAME_WIN
      }
    } catch (xpError) {
      console.error('[Daily Submit] XP reward failed:', xpError)
    }

    // Update game stats
    try {
      await updateUserGameStats(userId, {
        won: parsedCorrect === parsedTotal && parsedTotal > 0,
        correctAnswers: parsedCorrect,
        totalAnswers: parsedTotal,
        streak: parsedCorrect,
      })
    } catch (statsError) {
      console.error('[Daily Submit] Game stats update failed:', statsError)
    }

    // Check achievements
    try {
      const unlocked = await checkAchievements(userId)
      newAchievements = unlocked.map(a => ({
        id: a.id,
        key: a.key,
        name: a.name,
        icon: a.icon,
        xpReward: a.xpReward,
      }))
    } catch (achError) {
      console.error('[Daily Submit] Achievement check failed:', achError)
    }

    // Get user's rank
    const higherScores = await db.dailyChallengeResult.count({
      where: {
        challengeId: challenge.id,
        score: { gt: parsedScore },
      },
    })
    const rank = higherScores + 1

    // Get total participants
    const participantCount = await db.dailyChallengeResult.count({
      where: { challengeId: challenge.id },
    })

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        score: result.score,
        correctCount: result.correctCount,
        totalCount: result.totalCount,
        timeTakenMs: result.timeTakenMs,
        completedAt: result.completedAt,
      },
      profile: updatedProfile,
      achievements: newAchievements,
      xpEarned: totalXpEarned,
      rank,
      participantCount,
    })
  } catch (error) {
    console.error('[Daily Submit] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
