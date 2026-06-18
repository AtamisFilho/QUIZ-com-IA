'use client'

import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Users, Crown, ArrowLeft, Play, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'

export default function LobbyScreen() {
  const { t } = useTranslation()
  const { gameCode, players, isHost, setCurrentView, gameSettings } = useGameStore()
  const [copied, setCopied] = useState(false)
  const [starting, setStarting] = useState(false)

  const handleCopy = async () => {
    if (!gameCode) return
    try {
      await navigator.clipboard.writeText(gameCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  const handleStart = () => {
    setStarting(true)
    window.dispatchEvent(new CustomEvent('quiz-start-game'))
  }

  const sortedPlayers = [...players].sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0))

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Button
          variant="ghost"
          onClick={() => setCurrentView('landing')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('common.back')}
        </Button>

        <Card className="border-border/50 shadow-xl shadow-quiz-purple/5 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-quiz-purple to-quiz-violet p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">{t('lobby.title')}</h2>
            <p className="text-white/70 text-sm">{t('lobby.shareCode')}</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Room Code */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-muted/50 border-2 border-dashed border-quiz-purple/30">
                <span className="text-3xl font-mono font-bold tracking-[0.2em] text-quiz-purple">
                  {gameCode}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="h-10 w-10 rounded-xl border-quiz-purple/30"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-quiz-emerald" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {copied && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-quiz-emerald font-medium"
              >
                {t('lobby.codeCopied')}
              </motion.p>
            )}

            {/* Game Settings Summary */}
            {gameSettings && (
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary" className="bg-quiz-purple/10 text-quiz-purple border-quiz-purple/20">
                  {t(`category.${gameSettings.category}` as Parameters<typeof t>[0])}
                </Badge>
                <Badge variant="secondary" className="bg-quiz-amber/10 text-quiz-amber border-quiz-amber/20">
                  {t(`difficulty.${gameSettings.difficulty}` as Parameters<typeof t>[0])}
                </Badge>
                <Badge variant="secondary" className="bg-quiz-emerald/10 text-quiz-emerald border-quiz-emerald/20">
                  {gameSettings.questionCount} Q
                </Badge>
                <Badge variant="secondary" className="bg-quiz-rose/10 text-quiz-rose border-quiz-rose/20">
                  {gameSettings.timePerQuestion}s
                </Badge>
              </div>
            )}

            {/* Players List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-quiz-purple" />
                  {t('lobby.players')} ({players.length})
                </h3>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {sortedPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-2xl">{player.avatar}</span>
                      <span className="flex-1 font-medium truncate">{player.name}</span>
                      {player.isHost && (
                        <Badge className="bg-quiz-amber/20 text-quiz-amber border-quiz-amber/30 text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Host
                        </Badge>
                      )}
                      <div className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-quiz-emerald' : 'bg-muted-foreground/30'}`} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Start Game Button */}
            {isHost ? (
              <Button
                onClick={handleStart}
                disabled={starting || players.length < 1}
                className="w-full py-6 text-lg bg-gradient-to-r from-quiz-emerald to-quiz-cyan hover:from-quiz-cyan hover:to-quiz-emerald shadow-lg shadow-quiz-emerald/20 text-white rounded-xl"
              >
                {starting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('common.loading')}</>
                ) : (
                  <><Play className="w-5 h-5 mr-2" /> {t('lobby.startGame')}</>
                )}
              </Button>
            ) : (
              <div className="text-center p-4 rounded-xl bg-muted/30">
                <p className="text-muted-foreground text-sm">{t('lobby.waitingForHost')}</p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
