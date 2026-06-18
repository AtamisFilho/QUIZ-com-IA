'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, XCircle, Flame, Zap, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

const OPTION_COLORS = [
  { bg: 'from-quiz-emerald to-emerald-600', hover: 'hover:shadow-quiz-emerald/30', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  { bg: 'from-quiz-amber to-amber-600', hover: 'hover:shadow-quiz-amber/30', lightBg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  { bg: 'from-quiz-rose to-rose-600', hover: 'hover:shadow-quiz-rose/30', lightBg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-500', text: 'text-rose-700 dark:text-rose-400' },
  { bg: 'from-quiz-violet to-violet-600', hover: 'hover:shadow-quiz-violet/30', lightBg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-500', text: 'text-violet-700 dark:text-violet-400' },
]

const OPTION_LETTERS = ['A', 'B', 'C', 'D']

export default function QuizPlayScreen() {
  const { t } = useTranslation()
  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    timeRemaining,
    selectedOption,
    hasSubmittedAnswer,
    answerResult,
    showResult,
    players,
    playerId,
    gameSettings,
    setHasSubmittedAnswer,
    setSelectedOption,
  } = useGameStore()

  const [streakAnimation, setStreakAnimation] = useState(false)

  const myPlayer = players.find(p => p.id === playerId)
  const streak = myPlayer?.streak || 0
  const timePerQuestion = gameSettings?.timePerQuestion || 30
  const timePercentage = timePerQuestion > 0 ? (timeRemaining / timePerQuestion) * 100 : 0

  const handleSelectOption = useCallback((index: number) => {
    if (hasSubmittedAnswer || showResult) return
    setSelectedOption(index)
  }, [hasSubmittedAnswer, showResult, setSelectedOption])

  const handleSubmitAnswer = useCallback(() => {
    if (selectedOption === null || hasSubmittedAnswer || showResult) return

    setHasSubmittedAnswer(true)

    const responseTime = (gameSettings?.timePerQuestion || 30) * 1000 - timeRemaining * 1000

    window.dispatchEvent(new CustomEvent('quiz-submit-answer', {
      detail: { selectedIndex: selectedOption, responseTime },
    }))
  }, [selectedOption, hasSubmittedAnswer, showResult, timeRemaining, gameSettings, setHasSubmittedAnswer])

  // Auto-submit on selection
  useEffect(() => {
    if (selectedOption !== null && !hasSubmittedAnswer && !showResult) {
      const timer = setTimeout(handleSubmitAnswer, 300)
      return () => clearTimeout(timer)
    }
  }, [selectedOption, hasSubmittedAnswer, showResult, handleSubmitAnswer])

  // Streak animation
  useEffect(() => {
    if (streak >= 2) {
      const timer = setTimeout(() => setStreakAnimation(true), 0)
      const timer2 = setTimeout(() => setStreakAnimation(false), 1000)
      return () => { clearTimeout(timer); clearTimeout(timer2) }
    }
    return undefined
  }, [streak])

  if (!currentQuestion) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="animate-pulse text-xl text-muted-foreground">{t('common.loading')}</div>
      </div>
    )
  }

  const isTimerDanger = timePercentage <= 20
  const isTimerWarning = timePercentage <= 50 && !isTimerDanger

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col px-4 py-4 max-w-2xl mx-auto w-full">
      {/* Top Bar: Question Counter + Score + Streak */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary" className="bg-quiz-purple/10 text-quiz-purple border-quiz-purple/20">
          {t('quiz.question', { current: String(currentQuestionIndex + 1), total: String(totalQuestions) })}
        </Badge>
        <div className="flex items-center gap-3">
          {myPlayer && (
            <Badge variant="secondary" className="bg-quiz-amber/10 text-quiz-amber border-quiz-amber/20">
              <Trophy className="w-3 h-3 mr-1" /> {myPlayer.score}
            </Badge>
          )}
          {streak >= 2 && (
            <motion.div
              animate={streakAnimation ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Badge className="bg-quiz-rose/20 text-quiz-rose border-quiz-rose/30">
                <Flame className="w-3 h-3 mr-1" /> {streak}x
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
              {timeRemaining}s
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
        key={currentQuestionIndex}
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
            const isSelected = selectedOption === index
            const isCorrect = showResult && answerResult?.correctIndex === index
            const isWrong = showResult && isSelected && !answerResult?.isCorrect

            return (
              <motion.button
                key={`${currentQuestionIndex}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3 }}
                onClick={() => handleSelectOption(index)}
                disabled={hasSubmittedAnswer || showResult}
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
                  ${hasSubmittedAnswer && !isSelected && !isCorrect ? 'opacity-50' : ''}
                `}
              >
                {/* Letter Badge */}
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

                {/* Option Text */}
                <span className={`flex-1 font-medium ${isCorrect || isSelected ? 'text-lg' : ''}`}>
                  {option}
                </span>

                {/* Result Icon */}
                {isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                {isWrong && <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Result Feedback */}
      <AnimatePresence>
        {showResult && answerResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            {answerResult.isCorrect ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </motion.div>
                <div>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">
                    {t('quiz.correct', { points: String(answerResult.pointsEarned) })}
                  </p>
                  {streak >= 2 && (
                    <p className="text-sm text-quiz-rose font-semibold flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {t('quiz.streak', { count: String(streak) })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                <XCircle className="w-8 h-8 text-rose-600" />
                <div>
                  <p className="font-bold text-rose-700 dark:text-rose-400">
                    {t('quiz.incorrect', { answer: currentQuestion.options[answerResult.correctIndex] || '' })}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting indicator */}
      {hasSubmittedAnswer && !showResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-muted-foreground flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 animate-pulse" />
          {t('quiz.waitingForOthers')}
        </motion.div>
      )}
    </div>
  )
}
