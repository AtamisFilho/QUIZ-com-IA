'use client'

import { useState } from 'react'
import { useTranslation, type Locale } from '@/lib/i18n'
import { useGameStore, type GameSettings } from '@/lib/game-store'
import { CATEGORY_LABELS } from '@/lib/game-utils'
import { motion } from 'framer-motion'
import { Loader2, ArrowLeft, Sparkles, Users, Clock, Hash, Brain } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

const DIFFICULTY_OPTIONS: GameSettings['difficulty'][] = ['EASY', 'MEDIUM', 'HARD', 'MIXED']
const QUESTION_COUNTS = [5, 10, 15, 20]
const TIME_OPTIONS = [10, 15, 20, 30, 45, 60]

const LANGUAGES: { value: string; label: string }[] = [
  { value: 'pt-BR', label: 'Português (BR)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español (ES)' },
]

export default function CreateGameScreen() {
  const { t } = useTranslation()
  const { setCurrentView, setPlayerInfo, setGameInfo, setGameSettings, setPlayers, setIsHost } = useGameStore()

  const [playerName, setPlayerName] = useState('')
  const [category, setCategory] = useState('general')
  const [difficulty, setDifficulty] = useState<GameSettings['difficulty']>('MEDIUM')
  const [language, setLanguage] = useState('pt-BR')
  const [maxPlayers, setMaxPlayers] = useState([8])
  const [questionCount, setQuestionCount] = useState('10')
  const [timePerQuestion, setTimePerQuestion] = useState('20')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: playerName.trim(),
          settings: {
            category,
            difficulty,
            language,
            maxPlayers: maxPlayers[0],
            questionCount: Number(questionCount),
            timePerQuestion: Number(timePerQuestion),
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create game')
        return
      }

      setPlayerInfo({ id: data.playerId, name: playerName.trim(), avatar: data.avatar, isHost: true })
      setGameInfo({ code: data.gameCode, id: data.gameId })
      setGameSettings({
        category,
        difficulty,
        language,
        maxPlayers: maxPlayers[0],
        questionCount: Number(questionCount),
        timePerQuestion: Number(timePerQuestion),
      })
      setPlayers(data.players)
      setIsHost(true)

      // Also emit via Socket.IO for real-time
      window.dispatchEvent(new CustomEvent('quiz-create-room', {
        detail: {
          settings: { category, difficulty, language, maxPlayers: maxPlayers[0], questionCount: Number(questionCount), timePerQuestion: Number(timePerQuestion) },
          playerName: playerName.trim(),
          playerId: data.playerId,
        },
      }))

      setCurrentView('lobby')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const categoryKeys = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>

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

        <Card className="border-border/50 shadow-xl shadow-quiz-purple/5">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-quiz-purple to-quiz-violet">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">{t('gameSetup.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('app.subtitle')}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Player Name */}
              <div className="space-y-2">
                <Label htmlFor="playerName" className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-quiz-purple" />
                  {t('gameSetup.playerName')}
                </Label>
                <Input
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder={t('gameSetup.playerName')}
                  required
                  maxLength={20}
                  className="border-border/50 focus:border-quiz-purple/50"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-quiz-purple" />
                  {t('gameSetup.category')}
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {t(`category.${key}` as Parameters<typeof t>[0])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>{t('gameSetup.difficulty')}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant={difficulty === d ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDifficulty(d)}
                      className={difficulty === d ? 'bg-gradient-to-r from-quiz-purple to-quiz-violet text-white' : ''}
                    >
                      {t(`difficulty.${d}` as Parameters<typeof t>[0])}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>{t('gameSetup.language')}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Players */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-quiz-purple" />
                    {t('gameSetup.maxPlayers')}
                  </span>
                  <span className="text-sm font-bold text-quiz-purple">{maxPlayers[0]}</span>
                </Label>
                <Slider
                  value={maxPlayers}
                  onValueChange={setMaxPlayers}
                  min={2}
                  max={20}
                  step={1}
                />
              </div>

              {/* Question Count */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-quiz-purple" />
                  {t('gameSetup.questionCount')}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {QUESTION_COUNTS.map((c) => (
                    <Button
                      key={c}
                      type="button"
                      variant={questionCount === String(c) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setQuestionCount(String(c))}
                      className={questionCount === String(c) ? 'bg-gradient-to-r from-quiz-purple to-quiz-violet text-white' : ''}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Time Per Question */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-quiz-purple" />
                  {t('gameSetup.timePerQuestion')}
                </Label>
                <div className="grid grid-cols-6 gap-1.5">
                  {TIME_OPTIONS.map((tOpt) => (
                    <Button
                      key={tOpt}
                      type="button"
                      variant={timePerQuestion === String(tOpt) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimePerQuestion(String(tOpt))}
                      className={`text-xs ${timePerQuestion === String(tOpt) ? 'bg-gradient-to-r from-quiz-purple to-quiz-violet text-white' : ''}`}
                    >
                      {tOpt}s
                    </Button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !playerName.trim()}
                className="w-full py-6 text-lg bg-gradient-to-r from-quiz-purple to-quiz-violet hover:from-quiz-violet hover:to-quiz-rose shadow-lg shadow-quiz-purple/20 rounded-xl"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('common.loading')}</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" /> {t('gameSetup.createRoom')}</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
