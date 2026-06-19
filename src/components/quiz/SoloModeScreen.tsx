'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle2, XCircle, Flame, Zap, Trophy,
  ArrowLeft, Play, RotateCcw, Home, Settings, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const OPTION_COLORS = [
  { bg: 'from-quiz-emerald to-emerald-600', hover: 'hover:shadow-quiz-emerald/30', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'from-quiz-amber to-amber-600', hover: 'hover:shadow-quiz-amber/30', lightBg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  { bg: 'from-quiz-rose to-rose-600', hover: 'hover:shadow-quiz-rose/30', lightBg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-500', text: 'text-rose-700 dark:text-rose-400' },
  { bg: 'from-quiz-violet to-violet-600', hover: 'hover:shadow-quiz-violet/30', lightBg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-500', text: 'text-violet-700 dark:text-violet-400' },
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

interface SoloQuestion {
  text: string
  options: string[]
  correctIndex: number
  category: string
  difficulty: string
  explanation?: string
}

interface SoloGameState {
  status: 'setup' | 'playing' | 'result'
  questions: SoloQuestion[]
  currentIndex: number
  score: number
  streak: number
  bestStreak: number
  timeRemaining: number
  selectedOption: number | null
  hasSubmitted: boolean
  showResult: boolean
  correctCount: number
  totalAnswered: number
  totalTimeMs: number
  isLoading: boolean
}

const DEFAULT_TIME = 20

function getSoloQuestionFromGenerated(q: {
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation?: string
  category: string
  difficulty: string
}): SoloQuestion {
  const answerMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
  return {
    text: q.text,
    options: [q.optionA, q.optionB, q.optionC, q.optionD],
    correctIndex: answerMap[q.correctAnswer] ?? 0,
    category: q.category,
    difficulty: q.difficulty,
    explanation: q.explanation,
  }
}

export default function SoloModeScreen() {
  const { t, locale } = useTranslation()
  const { setCurrentView, playerName, setPlayerInfo } = useGameStore()

  const [state, setState] = useState<SoloGameState>({
    status: 'setup',
    questions: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    timeRemaining: DEFAULT_TIME,
    selectedOption: null,
    hasSubmitted: false,
    showResult: false,
    correctCount: 0,
    totalAnswered: 0,
    totalTimeMs: 0,
    isLoading: false,
  })

  // Setup form
  const [setupCategory, setSetupCategory] = useState('general')
  const [setupDifficulty, setSetupDifficulty] = useState('MIXED')
  const [setupQuestionCount, setSetupQuestionCount] = useState('10')
  const [setupTimePerQuestion, setSetupTimePerQuestion] = useState('20')
  const [setupPlayerName, setSetupPlayerName] = useState(playerName || '')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const timePerQuestion = parseInt(setupTimePerQuestion) || DEFAULT_TIME

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (state.status !== 'playing' || state.hasSubmitted || state.showResult) return

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          // Time's up - auto submit wrong
          return {
            ...prev,
            timeRemaining: 0,
            hasSubmitted: true,
            showResult: true,
            streak: 0,
            totalAnswered: prev.totalAnswered + 1,
            totalTimeMs: prev.totalTimeMs + (timePerQuestion * 1000),
          }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state.status, state.hasSubmitted, state.showResult, state.currentIndex, timePerQuestion])

  const startGame = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch('/api/solo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: setupCategory,
          difficulty: setupDifficulty,
          language: locale,
          questionCount: parseInt(setupQuestionCount) || 10,
          timePerQuestion: parseInt(setupTimePerQuestion) || 20,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game')
      }

      const questions: SoloQuestion[] = data.questions.map(getSoloQuestionFromGenerated)

      // Save player name
      const name = setupPlayerName.trim() || 'Player'
      const playerId = `solo-${Date.now()}`
      setPlayerInfo({ id: playerId, name, avatar: '🎮', isHost: false })

      setState({
        status: 'playing',
        questions,
        currentIndex: 0,
        score: 0,
        streak: 0,
        bestStreak: 0,
        timeRemaining: parseInt(setupTimePerQuestion) || DEFAULT_TIME,
        selectedOption: null,
        hasSubmitted: false,
        showResult: false,
        correctCount: 0,
        totalAnswered: 0,
        totalTimeMs: 0,
        isLoading: false,
      })
    } catch (err) {
      console.error('Failed to start solo game:', err)
      setState(prev => ({ ...prev, isLoading: false }))
    }
  }, [setupCategory, setupDifficulty, setupQuestionCount, setupTimePerQuestion, setupPlayerName, locale, setPlayerInfo])

  const handleSelectOption = useCallback((index: number) => {
    if (state.hasSubmitted || state.showResult) return
    setState(prev => ({ ...prev, selectedOption: index }))
  }, [state.hasSubmitted, state.showResult])

  const handleSubmitAnswer = useCallback(() => {
    if (state.selectedOption === null || state.hasSubmitted || state.showResult) return

    const currentQuestion = state.questions[state.currentIndex]
    if (!currentQuestion) return

    const isCorrect = state.selectedOption === currentQuestion.correctIndex
    const responseTimeMs = (timePerQuestion - state.timeRemaining) * 1000
    const speedBonus = isCorrect ? Math.max(0, Math.floor((state.timeRemaining / timePerQuestion) * 50)) : 0
    const streakBonus = isCorrect ? state.streak * 5 : 0
    const pointsEarned = isCorrect ? 100 + speedBonus + streakBonus : 0

    setState(prev => ({
      ...prev,
      hasSubmitted: true,
      showResult: true,
      score: prev.score + pointsEarned,
      streak: isCorrect ? prev.streak + 1 : 0,
      bestStreak: isCorrect ? Math.max(prev.bestStreak, prev.streak + 1) : prev.bestStreak,
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      totalAnswered: prev.totalAnswered + 1,
      totalTimeMs: prev.totalTimeMs + responseTimeMs,
    }))
  }, [state.selectedOption, state.hasSubmitted, state.showResult, state.questions, state.currentIndex, state.timeRemaining, state.streak, timePerQuestion])

  // Auto-submit on selection
  useEffect(() => {
    if (state.selectedOption !== null && !state.hasSubmitted && !state.showResult) {
      const timer = setTimeout(handleSubmitAnswer, 300)
      return () => clearTimeout(timer)
    }
  }, [state.selectedOption, state.hasSubmitted, state.showResult, handleSubmitAnswer])

  const handleNextQuestion = useCallback(() => {
    const nextIndex = state.currentIndex + 1
    if (nextIndex >= state.questions.length) {
      // Finish game
      setState(prev => ({ ...prev, status: 'result' }))

      // Try to save results to API
      fetch('/api/solo/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: state.score,
          correctCount: state.correctCount,
          totalCount: state.questions.length,
          streak: state.bestStreak,
          category: setupCategory,
          difficulty: setupDifficulty,
        }),
      }).catch(() => {})
    } else {
      setState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        timeRemaining: timePerQuestion,
        selectedOption: null,
        hasSubmitted: false,
        showResult: false,
      }))
    }
  }, [state.currentIndex, state.questions.length, state.score, state.correctCount, state.bestStreak, setupCategory, setupDifficulty, timePerQuestion])

  const handlePlayAgain = useCallback(() => {
    setState({
      status: 'setup',
      questions: [],
      currentIndex: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      timeRemaining: DEFAULT_TIME,
      selectedOption: null,
      hasSubmitted: false,
      showResult: false,
      correctCount: 0,
      totalAnswered: 0,
      totalTimeMs: 0,
      isLoading: false,
    })
  }, [])

  const handleQuickPlay = useCallback(() => {
    setSetupCategory('general')
    setSetupDifficulty('MIXED')
    setSetupQuestionCount('10')
    setSetupTimePerQuestion('20')
    // Trigger start after a tick
    setTimeout(() => {
      startGame()
    }, 50)
  }, [startGame])

  // ============ RENDER: SETUP ============
  if (state.status === 'setup') {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-quiz-purple to-quiz-violet mb-4"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-quiz-purple to-quiz-violet bg-clip-text text-transparent">
              {t('solo.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('solo.subtitle')}</p>
          </div>

          {/* Quick Play */}
          <Card className="mb-6 border-quiz-purple/20">
            <CardContent className="p-4">
              <Button
                onClick={handleQuickPlay}
                disabled={state.isLoading}
                className="w-full h-14 text-lg bg-gradient-to-r from-quiz-purple to-quiz-violet text-white font-bold"
              >
                {state.isLoading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5 animate-pulse" />
                    {t('common.loading')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    {t('solo.quickPlay')}
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Custom Setup */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5 text-quiz-purple" />
                {t('solo.setupTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Player Name */}
              <div className="space-y-2">
                <Label>{t('gameSetup.playerName')}</Label>
                <Input
                  value={setupPlayerName}
                  onChange={(e) => setSetupPlayerName(e.target.value)}
                  placeholder={t('gameSetup.playerName')}
                  maxLength={20}
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{t('gameSetup.category')}</Label>
                <Select value={setupCategory} onValueChange={setSetupCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('category.general')}</SelectItem>
                    <SelectItem value="science">{t('category.science')}</SelectItem>
                    <SelectItem value="history">{t('category.history')}</SelectItem>
                    <SelectItem value="geography">{t('category.geography')}</SelectItem>
                    <SelectItem value="sports">{t('category.sports')}</SelectItem>
                    <SelectItem value="entertainment">{t('category.entertainment')}</SelectItem>
                    <SelectItem value="technology">{t('category.technology')}</SelectItem>
                    <SelectItem value="literature">{t('category.literature')}</SelectItem>
                    <SelectItem value="art">{t('category.art')}</SelectItem>
                    <SelectItem value="music">{t('category.music')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>{t('gameSetup.difficulty')}</Label>
                <Select value={setupDifficulty} onValueChange={setSetupDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">{t('difficulty.EASY')}</SelectItem>
                    <SelectItem value="MEDIUM">{t('difficulty.MEDIUM')}</SelectItem>
                    <SelectItem value="HARD">{t('difficulty.HARD')}</SelectItem>
                    <SelectItem value="MIXED">{t('difficulty.MIXED')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Count */}
              <div className="space-y-2">
                <Label>{t('gameSetup.questionCount')}</Label>
                <Select value={setupQuestionCount} onValueChange={setSetupQuestionCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Per Question */}
              <div className="space-y-2">
                <Label>{t('gameSetup.timePerQuestion')}</Label>
                <Select value={setupTimePerQuestion} onValueChange={setSetupTimePerQuestion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10s</SelectItem>
                    <SelectItem value="15">15s</SelectItem>
                    <SelectItem value="20">20s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="45">45s</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Button */}
              <Button
                onClick={startGame}
                disabled={state.isLoading}
                className="w-full bg-gradient-to-r from-quiz-purple to-quiz-violet text-white font-bold mt-2"
              >
                {state.isLoading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 animate-pulse" />
                    {t('common.loading')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    {t('solo.start')}
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => setCurrentView('landing')}
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('solo.backToHome')}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ============ RENDER: PLAYING ============
  if (state.status === 'playing') {
    const currentQuestion = state.questions[state.currentIndex]
    if (!currentQuestion) return null

    const timePercentage = timePerQuestion > 0 ? (state.timeRemaining / timePerQuestion) * 100 : 0
    const isTimerDanger = timePercentage <= 20
    const isTimerWarning = timePercentage <= 50 && !isTimerDanger

    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col px-4 py-4 max-w-2xl mx-auto w-full">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className="bg-quiz-purple/10 text-quiz-purple border-quiz-purple/20">
            {t('quiz.question', { current: String(state.currentIndex + 1), total: String(state.questions.length) })}
          </Badge>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-quiz-amber/10 text-quiz-amber border-quiz-amber/20">
              <Trophy className="w-3 h-3 mr-1" /> {state.score}
            </Badge>
            {state.streak >= 2 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
              >
                <Badge className="bg-quiz-rose/20 text-quiz-rose border-quiz-rose/30">
                  <Flame className="w-3 h-3 mr-1" /> {state.streak}x
                </Badge>
              </motion.div>
            )}
          </div>
        </div>

        {/* Timer Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-sm">
              <Clock className={`w-4 h-4 ${isTimerDanger ? 'text-quiz-rose animate-countdown-pulse' : isTimerWarning ? 'text-quiz-amber' : 'text-quiz-emerald'}`} />
              <span className={isTimerDanger ? 'text-quiz-rose font-bold' : isTimerWarning ? 'text-quiz-amber' : 'text-quiz-emerald'}>
                {state.timeRemaining}s
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isTimerDanger ? 'timer-bar-danger' : isTimerWarning ? 'timer-bar-warning' : 'timer-bar-safe'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${timePercentage}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          key={state.currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="mb-5"
        >
          <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-lg">
            {currentQuestion.category && (
              <div className="mb-3">
                <Badge variant="outline" className="text-xs">
                  {currentQuestion.category} · {currentQuestion.difficulty}
                </Badge>
              </div>
            )}
            <h2 className="text-xl sm:text-2xl font-bold leading-relaxed">
              {currentQuestion.text}
            </h2>
          </div>
        </motion.div>

        {/* Options */}
        <div className="flex-1 grid gap-3">
          <AnimatePresence mode="wait">
            {currentQuestion.options.map((option, index) => {
              const color = OPTION_COLORS[index]
              const letter = OPTION_LETTERS[index]
              const isSelected = state.selectedOption === index
              const isCorrect = state.showResult && currentQuestion.correctIndex === index
              const isWrong = state.showResult && isSelected && index !== currentQuestion.correctIndex

              return (
                <motion.button
                  key={`${state.currentIndex}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  onClick={() => handleSelectOption(index)}
                  disabled={state.hasSubmitted || state.showResult}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left
                    ${isCorrect
                      ? `${color.lightBg} ${color.border} shadow-lg`
                      : isWrong
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 shadow-lg animate-shake'
                        : isSelected
                          ? `bg-gradient-to-r ${color.bg} text-white border-transparent shadow-lg ${color.hover}`
                          : 'bg-card border-border/50 hover:border-quiz-purple/30 hover:shadow-md'
                    }
                    ${state.hasSubmitted && !isSelected && !isCorrect ? 'opacity-50' : ''}
                  `}
                >
                  <span className={`
                    flex items-center justify-center w-9 h-9 rounded-lg font-bold text-sm shrink-0
                    ${isCorrect
                      ? 'bg-white/20 text-white'
                      : isWrong
                        ? 'bg-rose-500/20 text-rose-700'
                        : isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-muted/50 text-muted-foreground'
                    }
                  `}>
                    {letter}
                  </span>
                  <span className={`flex-1 font-medium ${isCorrect || isSelected ? 'text-lg' : ''}`}>
                    {option}
                  </span>
                  {isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                  {isWrong && <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Result Feedback */}
        <AnimatePresence>
          {state.showResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4"
            >
              {state.selectedOption === currentQuestion.correctIndex ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">
                      {t('quiz.correct', { points: String(100 + Math.max(0, Math.floor((state.timeRemaining / timePerQuestion) * 50)) + state.streak * 5) })}
                    </p>
                    {state.streak >= 2 && (
                      <p className="text-sm text-quiz-rose font-semibold flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {t('quiz.streak', { count: String(state.streak) })}
                      </p>
                    )}
                    {currentQuestion.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{currentQuestion.explanation}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-700 dark:text-rose-400">
                      {state.selectedOption === null
                        ? t('quiz.timeUp')
                        : t('quiz.incorrect', { answer: currentQuestion.options[currentQuestion.correctIndex] || '' })
                      }
                    </p>
                    {currentQuestion.explanation && (
                      <p className="text-xs text-muted-foreground mt-1">{currentQuestion.explanation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Next Button */}
              <Button
                onClick={handleNextQuestion}
                className="w-full mt-3 bg-gradient-to-r from-quiz-purple to-quiz-violet text-white font-bold"
              >
                {state.currentIndex + 1 >= state.questions.length ? t('solo.yourResult') : t('solo.start')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ============ RENDER: RESULT ============
  const accuracy = state.totalAnswered > 0 ? Math.round((state.correctCount / state.totalAnswered) * 100) : 0
  const avgTimeMs = state.totalAnswered > 0 ? Math.round(state.totalTimeMs / state.totalAnswered) : 0

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-full max-w-md"
      >
        {/* Trophy */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-quiz-amber to-yellow-500 mb-4"
          >
            <Trophy className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold">{t('solo.yourResult')}</h2>
        </div>

        {/* Score Card */}
        <Card className="mb-6 border-quiz-purple/20">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <p className="text-5xl font-bold bg-gradient-to-r from-quiz-purple to-quiz-violet bg-clip-text text-transparent">
                {state.score}
              </p>
              <p className="text-muted-foreground text-sm mt-1">points</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Correct Answers */}
              <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {state.correctCount}/{state.questions.length}
                </p>
                <p className="text-xs text-muted-foreground">{t('solo.correctAnswers')}</p>
              </div>

              {/* Accuracy */}
              <div className="text-center p-3 rounded-xl bg-quiz-purple/10">
                <Zap className="w-6 h-6 text-quiz-purple mx-auto mb-1" />
                <p className="text-2xl font-bold text-quiz-purple">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">{t('results.accuracy')}</p>
              </div>

              {/* Average Time */}
              <div className="text-center p-3 rounded-xl bg-quiz-amber/10">
                <Clock className="w-6 h-6 text-quiz-amber mx-auto mb-1" />
                <p className="text-2xl font-bold text-quiz-amber">{(avgTimeMs / 1000).toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground">{t('solo.averageTime')}</p>
              </div>

              {/* Best Streak */}
              <div className="text-center p-3 rounded-xl bg-quiz-rose/10">
                <Flame className="w-6 h-6 text-quiz-rose mx-auto mb-1" />
                <p className="text-2xl font-bold text-quiz-rose">{state.bestStreak}x</p>
                <p className="text-xs text-muted-foreground">{t('solo.bestStreak')}</p>
              </div>
            </div>

            {/* Perfect game badge */}
            {accuracy === 100 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.5 }}
                className="mt-4 text-center"
              >
                <Badge className="bg-gradient-to-r from-quiz-amber to-yellow-500 text-white text-lg px-4 py-1">
                  🏆 {t('results.perfectGame')}
                </Badge>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handlePlayAgain}
            className="w-full h-12 bg-gradient-to-r from-quiz-purple to-quiz-violet text-white font-bold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('solo.playAgain')}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView('landing')}
            className="w-full h-12"
          >
            <Home className="w-4 h-4 mr-2" />
            {t('solo.backToHome')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
