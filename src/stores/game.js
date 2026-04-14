import { defineStore } from 'pinia'
import namesData from '../../top_10000_nomes_brasil_censo2022.json'

const TOP_N = 1000
const names = namesData.slice(0, TOP_N)

function pickRandom(exclude = []) {
  const excludeSet = new Set(exclude)
  const pool = names.filter(n => !excludeSet.has(n.nome))
  return pool[Math.floor(Math.random() * pool.length)]
}

export const useGameStore = defineStore('game', {
  state: () => ({
    phase: 'idle', // 'idle' | 'playing' | 'revealing' | 'gameover'
    leftCard: null,
    rightCard: null,
    score: 0,
    highScore: parseInt(localStorage.getItem('ibge-hs') || '0'),
    lastResult: null,  // 'correct' | 'wrong'
    winnerSide: null,  // 'left' | 'right'
    isNewRecord: false,
  }),

  actions: {
    start() {
      const a = pickRandom()
      const b = pickRandom([a.nome])
      this.leftCard = { ...a, revealed: false }
      this.rightCard = { ...b, revealed: false }
      this.score = 0
      this.phase = 'playing'
      this.lastResult = null
      this.winnerSide = null
      this.isNewRecord = false
    },

    choose(side) {
      if (this.phase !== 'playing') return

      const leftFreq = this.leftCard.frequencia
      const rightFreq = this.rightCard.frequencia
      const higherSide = leftFreq >= rightFreq ? 'left' : 'right'
      const correct = side === higherSide

      this.winnerSide = higherSide
      this.leftCard = { ...this.leftCard, revealed: true }
      this.rightCard = { ...this.rightCard, revealed: true }
      this.lastResult = correct ? 'correct' : 'wrong'
      this.phase = 'revealing'

      if (correct) this.score++
    },

    nextRound() {
      // Randomly pick which card stays — prevents always keeping popular names
      const keepLeft = Math.random() < 0.5
      const anchor = keepLeft ? this.leftCard : this.rightCard
      const newCard = pickRandom([this.leftCard.nome, this.rightCard.nome])

      this.leftCard = { ...anchor, revealed: true }
      this.rightCard = { ...newCard, revealed: false }
      this.phase = 'playing'
      this.lastResult = null
      this.winnerSide = null
    },

    gameOver() {
      this.isNewRecord = this.score > this.highScore
      if (this.isNewRecord) {
        this.highScore = this.score
        localStorage.setItem('ibge-hs', String(this.score))
      }
      this.phase = 'gameover'
    },
  },
})
