import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { seedAchievements } from '@/lib/profile-utils'

export async function GET() {
  try {
    await seedAchievements()
    const achievements = await db.achievement.findMany({
      orderBy: [{ category: 'asc' }, { xpReward: 'asc' }],
    })
    return NextResponse.json({ achievements })
  } catch (error) {
    console.error('[Achievements] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
