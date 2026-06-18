'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { I18nProvider } from '@/lib/i18n'
import { useGameStore } from '@/lib/game-store'
import { Toaster, toast } from 'sonner'
import Header from '@/components/quiz/Header'
import LandingScreen from '@/components/quiz/LandingScreen'
import CreateGameScreen from '@/components/quiz/CreateGameScreen'
import JoinGameScreen from '@/components/quiz/JoinGameScreen'
import LobbyScreen from '@/components/quiz/LobbyScreen'
import QuizPlayScreen from '@/components/quiz/QuizPlayScreen'
import ResultsScreen from '@/components/quiz/ResultsScreen'
import AdminPanel from '@/components/quiz/AdminPanel'

function GameApp() {
  const {
    currentView,
    setCurrentView,
    setPlayerInfo,
    setGameInfo,
    setGameSettings,
    setPlayers,
    addPlayer,
    removePlayer,
    setIsHost,
    setQuestion,
    setTimeRemaining,
    setHasSubmittedAnswer,
    setAnswerResult,
    setShowResult,
    setFinalResults,
    setIsConnected,
    setError,
    playerId,
    gameCode,
    reset,
  } = useGameStore()

  const socketRef = useRef<Socket | null>(null)

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('create-room', (data: { code: string; playerId: string; avatar: string; state: Record<string, unknown> }) => {
      setGameInfo({ code: data.code, id: '' })
      if (data.state) {
        const state = data.state as { settings?: Record<string, unknown>; players?: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }> }
        if (state.settings) setGameSettings(state.settings as Parameters<typeof setGameSettings>[0])
        if (state.players) setPlayers(state.players)
      }
    })

    socket.on('join-room', (data: { playerId: string; avatar: string; state: Record<string, unknown> }) => {
      if (data.state) {
        const state = data.state as { code?: string; settings?: Record<string, unknown>; players?: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }> }
        if (state.code) setGameInfo({ code: state.code, id: '' })
        if (state.settings) setGameSettings(state.settings as Parameters<typeof setGameSettings>[0])
        if (state.players) setPlayers(state.players)
      }
    })

    socket.on('player-joined', (data: { player: { id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }; message: string }) => {
      addPlayer(data.player)
      toast.info(data.message)
    })

    socket.on('player-left', (data: { player: { id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }; message: string }) => {
      removePlayer(data.player.id)
      toast.info(data.message)
    })

    socket.on('room-state', (state: Record<string, unknown>) => {
      const s = state as { code?: string; settings?: Record<string, unknown>; players?: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: unknown }> }
      if (s.settings) setGameSettings(s.settings as Parameters<typeof setGameSettings>[0])
      if (s.players) setPlayers(s.players.map((p) => ({ ...p, isConnected: !!p.isConnected })))
    })

    socket.on('start-game', (data: { state: Record<string, unknown> }) => {
      const state = data.state as { settings?: Record<string, unknown>; players?: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }> }
      if (state.players) setPlayers(state.players)
      setCurrentView('playing')
    })

    socket.on('next-question', (data: { index: number; text: string; options: string[]; category: string; difficulty: string; timePerQuestion: number }) => {
      const totalQ = useGameStore.getState().totalQuestions || useGameStore.getState().gameSettings?.questionCount || 10
      setQuestion(
        { index: data.index, text: data.text, options: data.options, correctIndex: -1, category: data.category, difficulty: data.difficulty },
        totalQ,
      )
      setTimeRemaining(data.timePerQuestion)
      setCurrentView('playing')
    })

    socket.on('timer-sync', (data: { timeRemaining: number }) => {
      setTimeRemaining(data.timeRemaining)
    })

    socket.on('answer-received', () => {
      setHasSubmittedAnswer(true)
    })

    socket.on('question-result', (data: { questionIndex: number; correctIndex: number; correctOption: string; answers: Array<{ playerId: string; playerName: string; selectedIndex: number; isCorrect: boolean; pointsEarned: number }>; leaderboard: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }> }) => {
      const myAnswer = data.answers.find((a) => a.playerId === playerId)
      setAnswerResult({
        isCorrect: myAnswer?.isCorrect ?? false,
        pointsEarned: myAnswer?.pointsEarned ?? 0,
        correctIndex: data.correctIndex,
      })
      setShowResult(true)
      if (data.leaderboard) setPlayers(data.leaderboard)
    })

    socket.on('score-update', (data: { players: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }> }) => {
      setPlayers(data.players)
    })

    socket.on('game-ended', (data: { leaderboard: Array<{ id: string; name: string; avatar: string; score: number; streak: number; isHost: boolean; isConnected: boolean }>; roomCode: string }) => {
      setFinalResults(data.leaderboard)
      setCurrentView('results')

      fetch(`/api/game/${data.roomCode}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: data.leaderboard }),
      }).catch(() => {})
    })

    socket.on('error', (data: { message: string; code: string }) => {
      setError(data.message)
      toast.error(data.message)
    })

    socketRef.current = socket
    return socket
  }, [
    setPlayerInfo, setGameInfo, setGameSettings, setPlayers, addPlayer, removePlayer,
    setIsHost, setQuestion, setTimeRemaining, setHasSubmittedAnswer, setAnswerResult,
    setShowResult, setFinalResults, setIsConnected, setError, setCurrentView, playerId,
  ])

  useEffect(() => {
    const handleCreateRoom = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const socket = connectSocket()
      socket.emit('create-room', { settings: detail.settings, playerName: detail.playerName, playerId: detail.playerId })
    }

    const handleJoinRoom = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const socket = connectSocket()
      socket.emit('join-room', { code: detail.code, playerName: detail.playerName, playerId: detail.playerId })
    }

    const handleSubmitAnswer = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const socket = socketRef.current
      if (socket?.connected) {
        socket.emit('submit-answer', { selectedIndex: detail.selectedIndex, responseTime: detail.responseTime })
      }
    }

    const handleStartGame = () => {
      const socket = socketRef.current
      if (socket?.connected) socket.emit('start-game')
    }

    window.addEventListener('quiz-create-room', handleCreateRoom)
    window.addEventListener('quiz-join-room', handleJoinRoom)
    window.addEventListener('quiz-submit-answer', handleSubmitAnswer)
    window.addEventListener('quiz-start-game', handleStartGame)

    return () => {
      window.removeEventListener('quiz-create-room', handleCreateRoom)
      window.removeEventListener('quiz-join-room', handleJoinRoom)
      window.removeEventListener('quiz-submit-answer', handleSubmitAnswer)
      window.removeEventListener('quiz-start-game', handleStartGame)
    }
  }, [connectSocket])

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if ((currentView === 'lobby' || currentView === 'playing') && !socketRef.current?.connected && gameCode) {
      connectSocket()
    }
  }, [currentView, gameCode, connectSocket])

  const renderView = () => {
    switch (currentView) {
      case 'landing': return <LandingScreen />
      case 'create': return <CreateGameScreen />
      case 'join': return <JoinGameScreen />
      case 'lobby': return <LobbyScreen />
      case 'playing': return <QuizPlayScreen />
      case 'results': return <ResultsScreen />
      case 'admin': return <AdminPanel />
      default: return <LandingScreen />
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {renderView()}
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <I18nProvider>
      <GameApp />
      <Toaster position="top-center" richColors />
    </I18nProvider>
  )
}
