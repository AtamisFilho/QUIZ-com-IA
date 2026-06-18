'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Users, Gamepad2, BookOpen, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AdminStats {
  totalGames: number
  activeGames: number
  finishedGames: number
  totalPlayers: number
  totalQuestions: number
  gamesByCategory: Array<{ category: string; _count: number }>
  gamesByDifficulty: Array<{ difficulty: string; _count: number }>
}

export default function AdminPanel() {
  const { t } = useTranslation()
  const { setCurrentView } = useGameStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch { /* noop */ }
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statCards = stats ? [
    { label: t('admin.totalGames'), value: stats.totalGames, icon: Gamepad2, color: 'from-quiz-purple to-quiz-violet' },
    { label: t('admin.activeGames'), value: stats.activeGames, icon: Activity, color: 'from-quiz-emerald to-quiz-cyan' },
    { label: t('admin.totalPlayers'), value: stats.totalPlayers, icon: Users, color: 'from-quiz-amber to-yellow-500' },
    { label: t('admin.totalQuestions'), value: stats.totalQuestions, icon: BookOpen, color: 'from-quiz-rose to-pink-500' },
  ] : []

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-8 max-w-4xl mx-auto w-full">
      <Button
        variant="ghost"
        onClick={() => setCurrentView('landing')}
        className="mb-6 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t('common.back')}
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-quiz-purple to-quiz-violet">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('admin.stats')}</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-8 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {statCards.map((stat) => (
                <Card key={stat.label} className="border-border/50 overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Category Distribution */}
            {stats?.gamesByCategory && stats.gamesByCategory.length > 0 && (
              <Card className="mb-6 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-quiz-purple" />
                    Games by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.gamesByCategory.map((item) => (
                      <Badge key={item.category} variant="secondary" className="bg-quiz-purple/10 text-quiz-purple">
                        {item.category}: {item._count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Difficulty Distribution */}
            {stats?.gamesByDifficulty && stats.gamesByDifficulty.length > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-quiz-amber" />
                    Games by Difficulty
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.gamesByDifficulty.map((item) => (
                      <Badge key={item.difficulty} variant="secondary" className="bg-quiz-amber/10 text-quiz-amber">
                        {item.difficulty}: {item._count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
