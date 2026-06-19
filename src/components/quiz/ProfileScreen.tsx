'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { useAuth } from '@/hooks/use-auth'
import { xpForLevel } from '@/lib/profile-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Edit3, Flame, Trophy, Target, Zap, Gamepad2 } from 'lucide-react'

interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  xpReward: number
  unlockedAt?: string
}

interface ProfileData {
  displayName: string
  avatarEmoji: string
  avatarColor: string
  level: number
  xp: number
  totalGames: number
  totalWins: number
  totalCorrect: number
  totalAnswered: number
  bestStreak: number
  dailyStreak: number
  subscriptionTier: string
  achievements: Achievement[]
}

const colorMap: Record<string, string> = {
  purple: 'bg-purple-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  violet: 'bg-violet-500',
}

const tierBadge: Record<string, { label: string; className: string }> = {
  free: { label: 'Free', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  pro: { label: 'Pro', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  corporate: { label: 'Corporate', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' },
}

export default function ProfileScreen() {
  const { t } = useTranslation()
  const { setCurrentView } = useGameStore()
  const { profile, isLoggedIn, userId } = useAuth()
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/achievements')
        if (res.ok) {
          const data = await res.json()
          setAllAchievements(data.achievements || [])
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Build profile data from auth hook or defaults
  const profileData: ProfileData = {
    displayName: profile?.displayName || (isLoggedIn ? 'Player' : 'Guest'),
    avatarEmoji: profile?.avatarEmoji || '🎮',
    avatarColor: profile?.avatarColor || 'purple',
    level: profile?.level || 1,
    xp: profile?.xp || 0,
    totalGames: profile?.totalGames || 0,
    totalWins: profile?.totalWins || 0,
    totalCorrect: profile?.totalCorrect || 0,
    totalAnswered: profile?.totalAnswered || 0,
    bestStreak: profile?.bestStreak || 0,
    dailyStreak: profile?.dailyStreak || 0,
    subscriptionTier: profile?.subscriptionTier || 'free',
    achievements: profile?.achievements || [],
  }

  const xpForNextLevel = xpForLevel(profileData.level + 1)
  const xpForCurrentLevel = xpForLevel(profileData.level)
  const xpProgress = profileData.level > 1
    ? ((profileData.xp - totalXpForLevel(profileData.level)) / (xpForNextLevel - xpForCurrentLevel)) * 100
    : (profileData.xp / xpForNextLevel) * 100
  const progressValue = Math.min(Math.max(xpProgress, 0), 100)

  const winRate = profileData.totalGames > 0
    ? Math.round((profileData.totalWins / profileData.totalGames) * 100)
    : 0

  const accuracy = profileData.totalAnswered > 0
    ? Math.round((profileData.totalCorrect / profileData.totalAnswered) * 100)
    : 0

  // Build unlocked set
  const unlockedKeys = new Set(profileData.achievements.map((a: Achievement) => a.key || a.id))

  // Merge with all achievements
  const displayAchievements = allAchievements.length > 0
    ? allAchievements.map((a: Achievement) => ({
        ...a,
        unlockedAt: unlockedKeys.has(a.key || a.id) ? 'unlocked' : undefined,
      }))
    : profileData.achievements.map((a: Achievement) => ({ ...a, unlockedAt: 'unlocked' }))

  const bgColor = colorMap[profileData.avatarColor] || 'bg-purple-500'
  const tier = tierBadge[profileData.subscriptionTier] || tierBadge.free

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <Button
            variant="ghost"
            onClick={() => setCurrentView('landing')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </motion.div>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar */}
                <div className={`flex items-center justify-center w-24 h-24 rounded-2xl ${bgColor} shadow-lg`}>
                  <span className="text-5xl">{profileData.avatarEmoji}</span>
                </div>

                {/* Info */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <h2 className="text-2xl font-bold">{profileData.displayName}</h2>
                    <Badge variant="outline" className="gap-1">
                      <Zap className="h-3 w-3" />
                      {t('profile.level')} {profileData.level}
                    </Badge>
                    <Badge className={tier.className}>
                      {tier.label}
                    </Badge>
                  </div>

                  {/* XP Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{profileData.xp} XP</span>
                      <span>{xpForNextLevel} XP</span>
                    </div>
                    <Progress value={progressValue} className="h-3" />
                    <p className="text-xs text-muted-foreground text-center sm:text-left">
                      {Math.round(progressValue)}% — {xpForNextLevel - profileData.xp > 0 ? `${xpForNextLevel - profileData.xp} XP` : 'Max!'}
                    </p>
                  </div>
                </div>

                {/* Edit Button */}
                <Button variant="outline" size="sm" className="gap-1" disabled>
                  <Edit3 className="h-3 w-3" />
                  {t('profile.editProfile')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <Gamepad2 className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold">{profileData.totalGames}</span>
                <span className="text-xs text-muted-foreground">{t('profile.totalGames')}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-bold">{winRate}%</span>
                <span className="text-xs text-muted-foreground">{t('profile.winRate')}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <Flame className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold">{profileData.bestStreak}</span>
                <span className="text-xs text-muted-foreground">{t('profile.bestStreak')}</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <Target className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold">{accuracy}%</span>
                <span className="text-xs text-muted-foreground">{t('profile.accuracy')}</span>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Daily Streak */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('profile.dailyStreak')}</p>
                <p className="text-xl font-bold">{profileData.dailyStreak} {t('profile.days')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                {t('profile.achievements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {displayAchievements.map((ach, i) => {
                    const isUnlocked = !!ach.unlockedAt
                    return (
                      <motion.div
                        key={ach.id || ach.key || i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 * i }}
                        className={`relative rounded-lg border p-3 text-center transition-all ${
                          isUnlocked
                            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 shadow-sm'
                            : 'border-muted bg-muted/30 opacity-50 grayscale'
                        }`}
                      >
                        <div className="text-3xl mb-1">
                          {isUnlocked ? ach.icon : '?'}
                        </div>
                        <p className="text-xs font-semibold truncate">
                          {isUnlocked ? ach.name : '???'}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {isUnlocked ? ach.description : '???'}
                        </p>
                        {isUnlocked && (
                          <Badge variant="secondary" className="mt-1 text-[10px] px-1 py-0">
                            +{ach.xpReward} XP
                          </Badge>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
              {displayAchievements.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-8">
                  {t('profile.noAchievements')}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// Helper: total XP needed to reach a given level
function totalXpForLevel(level: number): number {
  let total = 0
  for (let i = 1; i < level; i++) {
    total += xpForLevel(i)
  }
  return total
}
