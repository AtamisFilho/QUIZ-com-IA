import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { updateUserGameStats, addXpToUser, checkAchievements, XP_REWARDS } from '@/lib/profile-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, score, correctCount, totalCount, streak, category, difficulty } = body

    const parsedScore = Number(score) || 0
    const parsedCorrect = Number(correctCount) || 0
    const parsedTotal = Number(totalCount) || 0
    const parsedStreak = Number(streak) || 0

    let updatedProfile = null
    let newAchievements: Array<{ id: string; key: string; name: string; icon: string; xpReward: number }> = []

    // If userId provided, update profile
    if (userId) {
      try {
        // Add XP for game completion
        await addXpToUser(userId, XP_REWARDS.GAME_COMPLETE)

        // Add XP for correct answers
        if (parsedCorrect > 0) {
          await addXpToUser(userId, parsedCorrect * XP_REWARDS.CORRECT_ANSWER)
        }

        // Add XP for streak bonus
        if (parsedStreak >= 5) {
          await addXpToUser(userId, XP_REWARDS.STREAK_5)
        }

        // Update game stats
        const isPerfect = parsedCorrect === parsedTotal && parsedTotal > 0
        updatedProfile = await updateUserGameStats(userId, {
          won: isPerfect,
          correctAnswers: parsedCorrect,
          totalAnswers: parsedTotal,
          streak: parsedStreak,
        })

        // Check for new achievements
        const unlocked = await checkAchievements(userId)
        newAchievements = unlocked.map(a => ({
          id: a.id,
          key: a.key,
          name: a.name,
          icon: a.icon,
          xpReward: a.xpReward,
        }))
      } catch (profileError) {
        console.error('[Solo Finish] Profile update failed:', profileError)
      }
    }

    // Create a solo game record in the database
    try {
      const game = await db.game.create({
        data: {
          code: `SOLO-${Date.now().toString(36).toUpperCase()}`,
          type: 'solo',
          status: 'FINISHED',
          category: category || 'general',
          difficulty: difficulty || 'MIXED',
          language: 'pt-BR',
          maxPlayers: 1,
          questionCount: parsedTotal,
          timePerQuestion: 20,
          currentQuestionIndex: parsedTotal,
        },
      })

      // Create player record
      await db.gamePlayer.create({
        data: {
          name: userId ? 'Registered Player' : 'Guest',
          score: parsedScore,
          streak: parsedStreak,
          isHost: true,
          isConnected: false,
          gameId: game.id,
          userId: userId || undefined,
        },
      })
    } catch (dbError) {
      console.error('[Solo Finish] Game record creation failed:', dbError)
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      achievements: newAchievements,
      xpEarned: XP_REWARDS.GAME_COMPLETE + (parsedCorrect * XP_REWARDS.CORRECT_ANSWER) + (parsedStreak >= 5 ? XP_REWARDS.STREAK_5 : 0),
    })
  } catch (error) {
    console.error('[Solo Finish] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
