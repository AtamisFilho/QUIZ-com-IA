import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { xpForLevel } from '@/lib/profile-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    const profile = await db.userProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
            achievements: {
              include: { achievement: true },
              orderBy: { unlockedAt: 'desc' },
            },
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Extract achievements from user relation
    const achievements = (profile.user.achievements || []).map(a => ({
      ...a.achievement,
      unlockedAt: a.unlockedAt,
    }))

    return NextResponse.json({
      ...profile,
      xpForNextLevel: xpForLevel(profile.level),
      achievements,
    })
  } catch (error) {
    console.error('[Profile] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
