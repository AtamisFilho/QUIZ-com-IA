'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Trophy, Medal, Crown, TrendingUp } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  name: string
  avatarEmoji: string
  avatarColor: string
  level: number
  totalScore: number
  gamesPlayed: number
  winRate: number
  bestStreak: number
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

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />
  return null
}

function getRankBg(rank: number) {
  if (rank === 1) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
  if (rank === 2) return 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
  if (rank === 3) return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
  return 'bg-background border-border'
}

export default function LeaderboardScreen() {
  const { t } = useTranslation()
  const { setCurrentView } = useGameStore()
  const { profile, userId } = useAuth()
  const [period, setPeriod] = useState('all')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)
      try {
        const res = await fetch(`/api/leaderboard?period=${period}&limit=100`)
        if (res.ok) {
          const data = await res.json()
          setLeaderboard(data.leaderboard || [])

          // Find current user in leaderboard
          if (profile?.displayName) {
            const found = (data.leaderboard || []).find(
              (e: LeaderboardEntry) => e.name === profile.displayName
            )
            setMyRank(found || null)
          }
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }
    fetchLeaderboard()
  }, [period, profile?.displayName])

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

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8 text-amber-500" />
            {t('leaderboard.title')}
          </h1>
        </motion.div>

        {/* Your Rank Card */}
        {userId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                {myRank ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <TrendingUp className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{t('leaderboard.yourRank')}</p>
                      <p className="text-2xl font-bold">#{myRank.rank}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t('leaderboard.winRate')}</p>
                      <p className="text-lg font-semibold">{myRank.winRate}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t('leaderboard.gamesPlayed')}</p>
                      <p className="text-lg font-semibold">{myRank.gamesPlayed}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                      <TrendingUp className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">{t('leaderboard.noRank')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1">{t('leaderboard.allTime')}</TabsTrigger>
              <TabsTrigger value="week" className="flex-1">{t('leaderboard.thisWeek')}</TabsTrigger>
              <TabsTrigger value="today" className="flex-1">{t('leaderboard.today')}</TabsTrigger>
            </TabsList>

            {['all', 'week', 'today'].map((p) => (
              <TabsContent key={p} value={p}>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      {t('leaderboard.noRank')}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {leaderboard.map((entry, i) => {
                      const isMe = profile?.displayName === entry.name
                      const bgColor = colorMap[entry.avatarColor] || 'bg-purple-500'

                      return (
                        <motion.div
                          key={`${entry.name}-${entry.rank}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.03 * i }}
                        >
                          <Card className={`transition-all hover:shadow-md ${getRankBg(entry.rank)} ${isMe ? 'ring-2 ring-primary' : ''}`}>
                            <CardContent className="p-3 flex items-center gap-3">
                              {/* Rank */}
                              <div className="w-10 text-center shrink-0">
                                {getRankIcon(entry.rank) || (
                                  <span className="text-lg font-bold text-muted-foreground">#{entry.rank}</span>
                                )}
                              </div>

                              {/* Avatar */}
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className={`${bgColor} text-white text-lg`}>
                                  {entry.avatarEmoji}
                                </AvatarFallback>
                              </Avatar>

                              {/* Name & Level */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`font-semibold truncate ${isMe ? 'text-primary' : ''}`}>
                                    {entry.name}
                                    {isMe && (
                                      <Badge variant="secondary" className="ml-2 text-[10px]">
                                        {t('leaderboard.you')}
                                      </Badge>
                                    )}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {t('profile.level')} {entry.level} · {entry.bestStreak}🔥
                                </p>
                              </div>

                              {/* Score */}
                              <div className="text-right shrink-0">
                                <p className="font-bold text-sm">{entry.totalScore.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {entry.winRate}% · {entry.gamesPlayed} {t('leaderboard.gamesPlayed')}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
    </div>
  )
}
