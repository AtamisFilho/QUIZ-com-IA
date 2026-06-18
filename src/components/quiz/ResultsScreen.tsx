'use client'

import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion } from 'framer-motion'
import { Trophy, Medal, RotateCcw, Home, Crown, Star, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useMemo, useState } from 'react'

// Confetti particles - using useMemo instead of useState+useEffect to avoid lint error
function Confetti() {
  const particles = useMemo(() => {
    const colors = ['#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#ec4899']
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
    }))
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}

const RANK_STYLES = [
  { icon: Crown, bg: 'from-quiz-amber to-yellow-500', text: 'text-yellow-900', ring: 'ring-quiz-amber' },
  { icon: Medal, bg: 'from-gray-300 to-gray-400', text: 'text-gray-700', ring: 'ring-gray-300' },
  { icon: Medal, bg: 'from-amber-600 to-amber-700', text: 'text-amber-800', ring: 'ring-amber-600' },
]

export default function ResultsScreen() {
  const { t } = useTranslation()
  const { finalResults, playerId, setCurrentView, reset } = useGameStore()
  const [showConfetti, setShowConfetti] = useState(true)

  const myResult = finalResults.find(p => p.id === playerId)
  const myRank = finalResults.findIndex(p => p.id === playerId) + 1
  const winner = finalResults[0]
  const isWinner = winner?.id === playerId

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  const handlePlayAgain = () => {
    reset()
    setCurrentView('create')
  }

  const handleGoHome = () => {
    reset()
    setCurrentView('landing')
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col px-4 py-8 max-w-2xl mx-auto w-full">
      {showConfetti && isWinner && <Confetti />}

      {/* Winner Announcement */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-quiz-amber to-yellow-500 shadow-2xl shadow-quiz-amber/30 mb-4"
        >
          <Trophy className="w-10 h-10 text-white" />
        </motion.div>

        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
          {isWinner ? (
            <span className="bg-gradient-to-r from-quiz-amber to-yellow-500 bg-clip-text text-transparent">
              {t('results.congratulations')}
            </span>
          ) : (
            <span className="bg-gradient-to-r from-quiz-purple to-quiz-violet bg-clip-text text-transparent">
              {t('results.title')}
            </span>
          )}
        </h1>

        {winner && (
          <p className="text-lg font-semibold">
            <span className="text-2xl mr-2">{winner.avatar}</span>
            {t('results.winner', { name: winner.name })}
          </p>
        )}

        {myResult && (
          <div className="mt-3">
            <Badge className="bg-quiz-purple/15 text-quiz-purple border-quiz-purple/20 text-base px-4 py-1">
              {t('results.yourScore', { score: String(myResult.score) })} · #{myRank}
            </Badge>
          </div>
        )}
      </motion.div>

      {/* Leaderboard */}
      <Card className="border-border/50 shadow-xl overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-quiz-purple to-quiz-violet p-4 text-white">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {t('results.title')}
          </h2>
        </div>

        <div className="divide-y divide-border/30">
          {finalResults.map((player, index) => {
            const rankStyle = index < 3 ? RANK_STYLES[index] : null
            const isMe = player.id === playerId

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-4 ${isMe ? 'bg-quiz-purple/5' : ''}`}
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {rankStyle ? (
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${rankStyle.bg} text-white`}>
                      {index + 1}
                    </div>
                  ) : (
                    <span className="text-muted-foreground font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Avatar + Name */}
                <span className="text-2xl">{player.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isMe ? 'text-quiz-purple' : ''}`}>
                    {player.name} {isMe && '(You)'}
                  </p>
                  <div className="flex items-center gap-2">
                    {player.streak >= 2 && (
                      <span className="flex items-center gap-0.5 text-xs text-quiz-rose">
                        <Flame className="w-3 h-3" /> {player.streak}x
                      </span>
                    )}
                    {player.isHost && (
                      <span className="flex items-center gap-0.5 text-xs text-quiz-amber">
                        <Crown className="w-3 h-3" /> Host
                      </span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="font-bold text-lg">{player.score}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <Button
          onClick={handlePlayAgain}
          className="flex-1 py-5 text-lg bg-gradient-to-r from-quiz-purple to-quiz-violet hover:from-quiz-violet hover:to-quiz-rose shadow-lg shadow-quiz-purple/20 rounded-xl"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {t('results.playAgain')}
        </Button>
        <Button
          variant="outline"
          onClick={handleGoHome}
          className="flex-1 py-5 text-lg rounded-xl border-quiz-purple/30"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('results.backToHome')}
        </Button>
      </div>
    </div>
  )
}
