'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { useAuth } from '@/hooks/use-auth'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, CheckCircle2, XCircle, Flame, Zap, Trophy,
  ArrowLeft, Play, RotateCcw, Home, Calendar, Timer,
  Users, Crown, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const OPTION_COLORS = [
  { bg: 'from-quiz-emerald to-emerald-600', hover: 'hover:shadow-quiz-emerald/30', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'from-quiz-amber to-amber-600', hover: 'hover:shadow-quiz-amber/30', lightBg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  { bg: 'from-quiz-rose to-rose-600', hover: 'hover:shadow-quiz-rose/30', lightBg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-500', text: 'text-rose-700 dark:text-rose-400' },
  { bg: 'from-quiz-violet to-violet-600', hover: 'hover:shadow-quiz-violet/30', lightBg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-500', text: 'text-violet-700 dark:text-violet-400' },
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

const CATEGORY_ICONS: Record<string, string> = {
  general: '🌍',
  science: '🔬',
  history: '📜',
  geography: '🗺️',
  sports: '⚽',
  entertainment: '🎬',
  technology: '💻',
  literature: '📚',
  art: '🎨',
  music: '🎵',
}

interface DailyQuestion {
  text: string
  options: string[]
  correctIndex: number
  category: string
  difficulty: string
  explanation?: string
}

interface DailyChallengeData {
  date: string
  category: string
  difficulty: string
  language: string
  questions: DailyQuestion[]
  timePerQuestion: number
  completed: boolean
  bestScore: number | null
  correctCount: number | null
  totalCount: number | null
  timeTakenMs: number | null
  userRank: number | null
  participantCount: number
}

interface DailyGameState {
  status: 'loading' | 'setup' | 'playing' | 'result'
  challengeData: DailyChallengeData | null
  questions: DailyQuestion[]
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
  isSubmitting: boolean
  submitResult: {
    rank: number
    participantCount: number
    xpEarned: number
    achievements: Array<{ id: string; key: string; name: string; icon: string; xpReward: number }>
  } | null
}

const DAILY_TIME = 20

export default function DailyChallengeScreen() {
  const { t } = useTranslation()
  const { setCurrentView } = useGameStore()
  const { userId, profile } = useAuth()

  const [state, setState] = useState<DailyGameState>({
    status: 'loading',
    challengeData: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    timeRemaining: DAILY_TIME,
    selectedOption: null,
    hasSubmitted: false,
    showResult: false,
    correctCount: 0,
    totalAnswered: 0,
    totalTimeMs: 0,
    isSubmitting: false,
    submitResult: null,
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const questionStartRef = useRef<number>(Date.now())

  // Fetch daily challenge data
  useEffect(() => {
    async function fetchDaily() {
      try {
        const params = new URLSearchParams()
        if (userId) params.set('userId', userId)
        if (profile?.preferredLang) params.set('language', profile.preferredLang)

        const res = await fetch(`/api/daily?${params.toString()}`)
        if (res.ok) {
          const data: DailyChallengeData = await res.json()
          setState(prev => ({
            ...prev,
            status: 'setup',
            challengeData: data,
            questions: data.questions || [],
          }))
        } else {
          console.error('Failed to fetch daily challenge')
          setState(prev => ({ ...prev, status: 'setup' }))
        }
      } catch (err) {
        console.error('Failed to fetch daily challenge:', err)
        setState(prev => ({ ...prev, status: 'setup' }))
      }
    }
    fetchDaily()
  }, [userId, profile?.preferredLang])

  // Timer logic
  useEffect(() => {
    if (state.status !== 'playing' || state.hasSubmitted) return

    timerRef.current = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining <= 1) {
          // Time's up
          if (timerRef.current) clearInterval(timerRef.current)
          return { ...prev, timeRemaining: 0 }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [state.status, state.currentIndex, state.hasSubmitted])

  function handleTimeUp() {
    setState(prev => ({
      ...prev,
      hasSubmitted: true,
      showResult: true,
      selectedOption: -1,
      totalAnswered: prev.totalAnswered + 1,
      streak: 0,
    }))
  }

  // Auto-submit when time runs out
  useEffect(() => {
    if (state.status === 'playing' && state.timeRemaining === 0 && !state.hasSubmitted) {
      handleTimeUp()
    }
  }, [state.timeRemaining, state.hasSubmitted, state.status])

  function startChallenge() {
    questionStartRef.current = Date.now()
    setState(prev => ({
      ...prev,
      status: 'playing',
      currentIndex: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      timeRemaining: DAILY_TIME,
      selectedOption: null,
      hasSubmitted: false,
      showResult: false,
      correctCount: 0,
      totalAnswered: 0,
      totalTimeMs: 0,
      submitResult: null,
    }))
  }

  function handleOptionSelect(optionIndex: number) {
    if (state.hasSubmitted) return

    const currentQ = state.questions[state.currentIndex]
    if (!currentQ) return

    const responseTime = Date.now() - questionStartRef.current
    const isCorrect = optionIndex === currentQ.correctIndex
    const newStreak = isCorrect ? state.streak + 1 : 0
    const speedBonus = Math.max(0, Math.round((1 - responseTime / (DAILY_TIME * 1000)) * 50))
    const streakBonus = Math.min(newStreak, 10) * 10
    const pointsEarned = isCorrect ? 100 + speedBonus + streakBonus : 0

    if (timerRef.current) clearInterval(timerRef.current)

    setState(prev => ({
      ...prev,
      selectedOption: optionIndex,
      hasSubmitted: true,
      showResult: true,
      score: prev.score + pointsEarned,
      streak: newStreak,
      bestStreak: Math.max(prev.bestStreak, newStreak),
      correctCount: prev.correctCount + (isCorrect ? 1 : 0),
      totalAnswered: prev.totalAnswered + 1,
      totalTimeMs: prev.totalTimeMs + responseTime,
    }))

    // Auto-advance after delay
    setTimeout(() => {
      advanceToNextQuestion()
    }, 2000)
  }

  function advanceToNextQuestion() {
    setState(prev => {
      if (prev.currentIndex >= prev.questions.length - 1) {
        // Challenge complete
        finishChallenge(prev)
        return prev
      }
      questionStartRef.current = Date.now()
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        timeRemaining: DAILY_TIME,
        selectedOption: null,
        hasSubmitted: false,
        showResult: false,
      }
    })
  }

  async function finishChallenge(currentState: DailyGameState) {
    if (!userId || state.isSubmitting) return

    setState(prev => ({ ...prev, isSubmitting: true }))

    try {
      const res = await fetch('/api/daily/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          score: currentState.score,
          correctCount: currentState.correctCount,
          totalCount: currentState.questions.length,
          timeTakenMs: currentState.totalTimeMs,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setState(prev => ({
          ...prev,
          status: 'result',
          isSubmitting: false,
          submitResult: {
            rank: data.rank,
            participantCount: data.participantCount,
            xpEarned: data.xpEarned,
            achievements: data.achievements || [],
          },
        }))
      } else {
        // Even if submission fails, show result
        setState(prev => ({
          ...prev,
          status: 'result',
          isSubmitting: false,
        }))
      }
    } catch {
      setState(prev => ({
        ...prev,
        status: 'result',
        isSubmitting: false,
      }))
    }
  }

  // Calculate time until next challenge (midnight)
  function getTimeUntilNextChallenge(): string {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const diff = tomorrow.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  // Timer bar color
  function getTimerColor(time: number): string {
    if (time > DAILY_TIME * 0.6) return 'from-emerald-500 to-emerald-400'
    if (time > DAILY_TIME * 0.3) return 'from-amber-500 to-amber-400'
    return 'from-rose-500 to-rose-400'
  }

  // ============================================================
  // RENDER: Loading
  // ============================================================

  if (state.status === 'loading') {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full border-4 border-quiz-amber/30 border-t-quiz-amber animate-spin" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </motion.div>
      </div>
    )
  }

  // ============================================================
  // RENDER: Setup (before starting)
  // ============================================================

  if (state.status === 'setup') {
    const challenge = state.challengeData
    const isCompleted = challenge?.completed
    const categoryIcon = challenge ? CATEGORY_ICONS[challenge.category] || '🎯' : '🎯'
    const dailyStreak = profile?.dailyStreak || 0

    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-quiz-amber/15 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-quiz-rose/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-lg"
        >
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView('landing')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t('common.back')}
          </Button>

          {/* Main Card */}
          <Card className="border-2 border-quiz-amber/30 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 mx-auto mb-3"
              >
                <Calendar className="w-10 h-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                {t('daily.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('daily.subtitle')}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Daily Streak */}
              {dailyStreak > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-100/80 to-orange-100/80 dark:from-amber-900/30 dark:to-orange-900/30"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Flame className="w-6 h-6 text-orange-500" />
                  </motion.div>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {dailyStreak} {t('daily.days')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t('daily.streak')}
                  </span>
                </motion.div>
              )}

              {/* Challenge Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-2xl mb-1">{categoryIcon}</span>
                  <span className="text-xs text-muted-foreground">{t('daily.category')}</span>
                  <span className="text-sm font-semibold capitalize">{challenge?.category || t('category.general')}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-2xl mb-1">{challenge?.difficulty === 'HARD' ? '🔴' : '🟡'}</span>
                  <span className="text-xs text-muted-foreground">{t('daily.difficulty')}</span>
                  <span className="text-sm font-semibold">{challenge?.difficulty ? t(`difficulty.${challenge.difficulty}` as Parameters<typeof t>[0]) : '—'}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-2xl mb-1">📝</span>
                  <span className="text-xs text-muted-foreground">{t('daily.questions')}</span>
                  <span className="text-sm font-semibold">{challenge?.questions?.length || 10}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <span className="text-2xl mb-1">⏱️</span>
                  <span className="text-xs text-muted-foreground">{t('daily.timeLimit')}</span>
                  <span className="text-sm font-semibold">20s</span>
                </div>
              </div>

              {/* Already Completed */}
              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {t('daily.alreadyCompleted')}
                  </p>
                  {challenge?.bestScore !== null && challenge?.bestScore !== undefined && (
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {t('daily.yourScore')}: {challenge.bestScore}
                    </p>
                  )}
                  {challenge?.userRank && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                      {t('daily.yourRank')}: #{challenge.userRank}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {t('daily.nextChallenge')}: {getTimeUntilNextChallenge()}
                  </div>
                </motion.div>
              )}

              {/* Start Button */}
              {!isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    size="lg"
                    onClick={startChallenge}
                    className="w-full text-lg py-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all duration-300 rounded-xl"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {t('daily.startChallenge')}
                  </Button>
                </motion.div>
              )}

              {/* Back to Home */}
              {isCompleted && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentView('landing')}
                  className="w-full rounded-xl"
                >
                  <Home className="w-4 h-4 mr-2" />
                  {t('solo.backToHome')}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // ============================================================
  // RENDER: Playing
  // ============================================================

  if (state.status === 'playing') {
    const currentQ = state.questions[state.currentIndex]
    if (!currentQ) return null

    const timerPercent = (state.timeRemaining / DAILY_TIME) * 100
    const isCorrect = state.selectedOption === currentQ.correctIndex

    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col p-4 max-w-2xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-xs border-quiz-amber/50 text-quiz-amber">
            <Calendar className="w-3 h-3 mr-1" />
            {t('daily.title')}
          </Badge>
          <div className="flex items-center gap-3">
            {state.streak >= 2 && (
              <motion.div
                key={state.streak}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-1"
              >
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-bold text-orange-500">{state.streak}</span>
              </motion.div>
            )}
            <div className="flex items-center gap-1 text-sm font-semibold">
              <Zap className="w-4 h-4 text-quiz-amber" />
              <span>{state.score}</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <span>{t('quiz.question', { current: String(state.currentIndex + 1), total: String(state.questions.length) })}</span>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-6 overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${getTimerColor(state.timeRemaining)}`}
            initial={{ width: '100%' }}
            animate={{ width: `${timerPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {currentQ.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentQ.difficulty}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold leading-relaxed">
                  {currentQ.text}
                </h3>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = state.selectedOption === idx
                const isCorrectOption = idx === currentQ.correctIndex
                const showCorrect = state.showResult && isCorrectOption
                const showWrong = state.showResult && isSelected && !isCorrectOption

                return (
                  <motion.button
                    key={idx}
                    whileHover={!state.hasSubmitted ? { scale: 1.02 } : {}}
                    whileTap={!state.hasSubmitted ? { scale: 0.98 } : {}}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={state.hasSubmitted}
                    className={`
                      relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${state.hasSubmitted
                        ? showCorrect
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                          : showWrong
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30'
                            : 'border-border/50 opacity-50'
                        : `border-border/50 hover:border-quiz-amber/50 hover:shadow-md ${OPTION_COLORS[idx].hover}`
                      }
                    `}
                  >
                    <span className={`
                      flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm text-white
                      ${state.hasSubmitted
                        ? showCorrect
                          ? 'bg-emerald-500'
                          : showWrong
                            ? 'bg-rose-500'
                            : 'bg-muted'
                        : `bg-gradient-to-br ${OPTION_COLORS[idx].bg}`
                      }
                    `}>
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="flex-1 text-sm font-medium">
                      {option}
                    </span>
                    {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                    {showWrong && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                  </motion.button>
                )
              })}
            </div>

            {/* Answer Feedback */}
            <AnimatePresence>
              {state.showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 text-center"
                >
                  {isCorrect ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-5 h-5 inline mr-1" />
                      {t('quiz.correct', { points: String(state.selectedOption !== -1 ? 100 : 0) })}
                    </p>
                  ) : (
                    <p className="text-rose-600 dark:text-rose-400 font-semibold">
                      <XCircle className="w-5 h-5 inline mr-1" />
                      {t('quiz.incorrect', { answer: currentQ.options[currentQ.correctIndex] })}
                    </p>
                  )}
                  {state.streak >= 3 && (
                    <motion.p
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-orange-500 font-bold mt-1 flex items-center justify-center gap-1"
                    >
                      <Flame className="w-4 h-4" />
                      {t('quiz.streak', { count: String(state.streak) })}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  // ============================================================
  // RENDER: Result
  // ============================================================

  if (state.status === 'result') {
    const accuracy = state.totalAnswered > 0
      ? Math.round((state.correctCount / state.totalAnswered) * 100)
      : 0
    const avgTime = state.totalAnswered > 0
      ? Math.round(state.totalTimeMs / state.totalAnswered / 100) / 10
      : 0
    const isPerfect = state.correctCount === state.questions.length && state.questions.length > 0

    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-lg"
        >
          {/* Result Card */}
          <Card className="border-2 border-quiz-amber/30 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-2"
              >
                <Trophy className="w-8 h-8 text-white" />
              </motion.div>
              <CardTitle className="text-2xl font-bold">
                {isPerfect ? '💎 ' : ''}{t('daily.yourScore')}
              </CardTitle>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"
              >
                {state.score}
              </motion.p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1" />
                  <span className="text-xs text-muted-foreground">{t('solo.correctAnswers')}</span>
                  <span className="text-lg font-bold">{state.correctCount}/{state.questions.length}</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <Target className="w-5 h-5 text-quiz-amber mb-1" />
                  <span className="text-xs text-muted-foreground">{t('profile.accuracy')}</span>
                  <span className="text-lg font-bold">{accuracy}%</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <Clock className="w-5 h-5 text-quiz-violet mb-1" />
                  <span className="text-xs text-muted-foreground">{t('solo.averageTime')}</span>
                  <span className="text-lg font-bold">{avgTime}s</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-xl bg-card/60 border border-border/50">
                  <Flame className="w-5 h-5 text-orange-500 mb-1" />
                  <span className="text-xs text-muted-foreground">{t('solo.bestStreak')}</span>
                  <span className="text-lg font-bold">{state.bestStreak}</span>
                </div>
              </div>

              {/* Rank & Participants */}
              {state.submitResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-around p-4 rounded-xl bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20 border border-quiz-amber/20"
                >
                  <div className="text-center">
                    <Crown className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <span className="text-xs text-muted-foreground">{t('daily.yourRank')}</span>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">#{state.submitResult.rank}</p>
                  </div>
                  <div className="w-px h-10 bg-border/50" />
                  <div className="text-center">
                    <Users className="w-5 h-5 text-quiz-violet mx-auto mb-1" />
                    <span className="text-xs text-muted-foreground">{t('daily.participants')}</span>
                    <p className="text-xl font-bold">{state.submitResult.participantCount}</p>
                  </div>
                </motion.div>
              )}

              {/* XP Earned */}
              {state.submitResult && state.submitResult.xpEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-quiz-amber/10 border border-quiz-amber/20"
                >
                  <Star className="w-5 h-5 text-quiz-amber" />
                  <span className="text-sm font-semibold text-quiz-amber">
                    +{state.submitResult.xpEarned} XP
                  </span>
                </motion.div>
              )}

              {/* Achievements */}
              {state.submitResult && state.submitResult.achievements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2"
                >
                  {state.submitResult.achievements.map(ach => (
                    <div
                      key={ach.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-quiz-amber/10 border border-quiz-amber/20"
                    >
                      <span className="text-xl">{ach.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{ach.name}</p>
                        <p className="text-xs text-muted-foreground">+{ach.xpReward} XP</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Next Challenge Countdown */}
              <div className="text-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 inline mr-1" />
                {t('daily.nextChallenge')}: {getTimeUntilNextChallenge()}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentView('landing')}
                  className="flex-1 rounded-xl"
                >
                  <Home className="w-4 h-4 mr-2" />
                  {t('solo.backToHome')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return null
}

function Target(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
