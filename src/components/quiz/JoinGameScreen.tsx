'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion } from 'framer-motion'
import { ArrowLeft, Gamepad2, User, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function JoinGameScreen() {
  const { t } = useTranslation()
  const { setCurrentView, setPlayerInfo, setGameInfo, setGameSettings, setPlayers, setIsHost } = useGameStore()

  const [code, setCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !playerName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/game/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: playerName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'Game not found') setError(t('join.invalidCode'))
        else if (data.error === 'Room is full') setError(t('join.roomFull'))
        else if (data.error === 'Name already taken') setError(t('join.nameTaken'))
        else setError(data.error || 'Error')
        return
      }

      setPlayerInfo({ id: data.playerId, name: playerName.trim(), avatar: data.avatar, isHost: false })
      setGameInfo({ code: code.toUpperCase(), id: '' })
      setPlayers(data.players)
      setIsHost(false)

      // Connect via Socket.IO
      window.dispatchEvent(new CustomEvent('quiz-join-room', {
        detail: {
          code: code.toUpperCase(),
          playerName: playerName.trim(),
          playerId: data.playerId,
        },
      }))

      setCurrentView('lobby')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Button
          variant="ghost"
          onClick={() => setCurrentView('landing')}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('common.back')}
        </Button>

        <Card className="border-border/50 shadow-xl shadow-quiz-emerald/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-quiz-emerald to-quiz-cyan">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{t('join.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('app.subtitle')}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Room Code */}
              <div className="space-y-2">
                <Label htmlFor="roomCode" className="flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-quiz-emerald" />
                  {t('join.enterCode')}
                </Label>
                <Input
                  id="roomCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  required
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.3em] border-border/50 focus:border-quiz-emerald/50 uppercase"
                />
              </div>

              {/* Player Name */}
              <div className="space-y-2">
                <Label htmlFor="joinName" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-quiz-emerald" />
                  {t('join.enterName')}
                </Label>
                <Input
                  id="joinName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t('join.enterName')}
                  required
                  maxLength={20}
                  className="border-border/50 focus:border-quiz-emerald/50"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !code.trim() || !playerName.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-quiz-emerald to-quiz-cyan hover:from-quiz-cyan hover:to-quiz-emerald shadow-lg shadow-quiz-emerald/20 text-white rounded-xl"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('common.loading')}</>
                ) : (
                  t('join.join')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
