import { db } from '@/lib/db'

// XP needed for each level
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

// Calculate level from XP
export function levelFromXp(xp: number): number {
  let level = 1
  let totalXp = 0
  while (totalXp + xpForLevel(level) <= xp) {
    totalXp += xpForLevel(level)
    level++
  }
  return level
}

// XP rewards for different actions
export const XP_REWARDS = {
  CORRECT_ANSWER: 10,
  GAME_COMPLETE: 50,
  GAME_WIN: 100,
  STREAK_5: 200,
  ACHIEVEMENT: 500,
  DAILY_CHALLENGE: 75,
} as const

// Add XP to user and check for level up
export async function addXpToUser(userId: string, amount: number) {
  const profile = await db.userProfile.findUnique({ where: { userId } })
  if (!profile) return null

  const newXp = profile.xp + amount
  const newLevel = levelFromXp(newXp)

  return db.userProfile.update({
    where: { userId },
    data: {
      xp: newXp,
      level: newLevel,
    },
  })
}

// Update game stats after a game
export async function updateUserGameStats(
  userId: string,
  data: {
    won?: boolean
    correctAnswers?: number
    totalAnswers?: number
    streak?: number
  }
) {
  const profile = await db.userProfile.findUnique({ where: { userId } })
  if (!profile) return null

  return db.userProfile.update({
    where: { userId },
    data: {
      totalGames: { increment: 1 },
      totalWins: { increment: data.won ? 1 : 0 },
      totalCorrect: { increment: data.correctAnswers || 0 },
      totalAnswered: { increment: data.totalAnswers || 0 },
      bestStreak: Math.max(profile.bestStreak, data.streak || 0),
    },
  })
}

// Check and unlock achievements
export async function checkAchievements(userId: string) {
  const profile = await db.userProfile.findUnique({ where: { userId } })
  if (!profile) return []

  const allAchievements = await db.achievement.findMany()
  const unlocked = await db.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  })
  const unlockedIds = new Set(unlocked.map(u => u.achievementId))

  const newUnlocks = []

  for (const ach of allAchievements) {
    if (unlockedIds.has(ach.id)) continue

    let shouldUnlock = false

    switch (ach.key) {
      case 'first_game':
        shouldUnlock = profile.totalGames >= 1
        break
      case 'genius_10':
        shouldUnlock = profile.bestStreak >= 10
        break
      case 'speedster':
        // Checked at answer time
        break
      case 'sharpshooter':
        shouldUnlock = profile.totalAnswered >= 10 && profile.totalCorrect === profile.totalAnswered
        break
      case 'champion_10':
        shouldUnlock = profile.totalWins >= 10
        break
      case 'encyclopedia':
        // Checked separately
        break
      case 'streak_master':
        shouldUnlock = profile.dailyStreak >= 30
        break
      case 'veteran_50':
        shouldUnlock = profile.totalGames >= 50
        break
      case 'level_10':
        shouldUnlock = profile.level >= 10
        break
      case 'perfect_game':
        // Checked at game end
        break
    }

    if (shouldUnlock) {
      await db.userAchievement.create({
        data: { userId, achievementId: ach.id },
      })
      await addXpToUser(userId, ach.xpReward)
      newUnlocks.push(ach)
    }
  }

  return newUnlocks
}

// Seed achievements if they don't exist
export async function seedAchievements() {
  const achievements = [
    { key: 'first_game', name: 'First Steps', description: 'Complete your first game', icon: '🎮', category: 'general', xpReward: 100 },
    { key: 'genius_10', name: 'Genius', description: 'Get 10 correct answers in a row', icon: '🧠', category: 'streak', xpReward: 500 },
    { key: 'speedster', name: 'Speedster', description: 'Answer in under 2 seconds', icon: '⚡', category: 'speed', xpReward: 200 },
    { key: 'sharpshooter', name: 'Sharpshooter', description: '100% accuracy in a game', icon: '🎯', category: 'accuracy', xpReward: 300 },
    { key: 'champion_10', name: 'Champion', description: 'Win 10 multiplayer games', icon: '🏆', category: 'social', xpReward: 500 },
    { key: 'encyclopedia', name: 'Encyclopedia', description: 'Play all 10 categories', icon: '📚', category: 'general', xpReward: 400 },
    { key: 'streak_master', name: 'Streak Master', description: '30-day daily streak', icon: '🔥', category: 'streak', xpReward: 1000 },
    { key: 'veteran_50', name: 'Veteran', description: 'Complete 50 games', icon: '🎖️', category: 'general', xpReward: 300 },
    { key: 'level_10', name: 'Rising Star', description: 'Reach level 10', icon: '⭐', category: 'general', xpReward: 500 },
    { key: 'perfect_game', name: 'Perfect Game', description: 'Answer all questions correctly', icon: '💎', category: 'accuracy', xpReward: 500 },
  ]

  for (const ach of achievements) {
    await db.achievement.upsert({
      where: { key: ach.key },
      update: ach,
      create: ach,
    })
  }
}
