<template>
  <div class="game-root">
    <!-- Subtle grain texture -->
    <div class="grain" aria-hidden="true"></div>

    <!-- ═══════════════ START SCREEN ═══════════════ -->
    <Transition name="screen-fade">
      <div v-if="store.phase === 'idle'" class="screen start-screen">
        <div class="start-inner">
          <h1 class="start-title">Duelo de Nomes</h1>

          <div class="start-divider" aria-hidden="true"></div>

          <p class="start-sub">Qual desses nomes é o mais comum?</p>

          <button class="btn-play" @click="startGame">
            <span>Jogar</span>
            <span class="btn-arrow">→</span>
          </button>

          <p v-if="store.highScore > 0" class="best-display">
            Seu recorde: <strong>{{ store.highScore }} pontos</strong>
          </p>
        </div>
      </div>
    </Transition>

    <!-- ═══════════════ GAME SCREEN ═══════════════ -->
    <Transition name="screen-fade">
      <div v-if="store.phase !== 'idle'" class="screen game-screen">

        <!-- Score Bar -->
        <header class="score-bar">
          <div class="score-block">
            <Transition name="score-pop" mode="out-in">
              <span :key="store.score" class="score-num">{{ store.score }}</span>
            </Transition>
            <span class="score-lbl">pontos</span>
          </div>

          <div class="score-logo">◆</div>

          <div class="score-block right">
            <span class="score-lbl">recorde</span>
            <span class="score-num">{{ store.highScore }}</span>
          </div>
        </header>

        <!-- Board -->
        <main class="board">
          <!-- Left Card -->
          <div class="card-slot">
            <Transition name="card-fade">
              <NameCard
                :key="'L-' + (store.leftCard?.nome ?? '')"
                :card="store.leftCard"
                :result="cardResult('left')"
                :can-click="isPlayable"
                @choose="store.choose('left')"
              />
            </Transition>
          </div>

          <!-- VS -->
          <div class="vs-wrap">
            <div class="vs-line"></div>
            <div class="vs-badge">VS</div>
            <div class="vs-line"></div>
          </div>

          <!-- Right Card -->
          <div class="card-slot">
            <Transition name="card-slide">
              <NameCard
                :key="'R-' + (store.rightCard?.nome ?? '')"
                :card="store.rightCard"
                :result="cardResult('right')"
                :can-click="isPlayable"
                @choose="store.choose('right')"
              />
            </Transition>
          </div>
        </main>

        <!-- ── Game Over Overlay ── -->
        <Transition name="overlay-in">
          <div v-if="store.phase === 'gameover'" class="go-overlay">
            <div class="go-card">
              <div class="go-icon-wrap">
                <div class="go-icon">✕</div>
              </div>

              <h2 class="go-title">Fim de jogo</h2>

              <div class="go-scores">
                <div class="go-score-main">
                  <span class="go-big-num">{{ store.score }}</span>
                  <span class="go-lbl">pontos</span>
                </div>

                <div v-if="store.isNewRecord" class="go-record-badge">
                  ✦ Novo recorde!
                </div>

                <div v-if="!store.isNewRecord" class="go-score-secondary">
                  <span class="go-small-num">{{ store.highScore }}</span>
                  <span class="go-lbl">recorde</span>
                </div>
              </div>

              <ScoreSubmit
                v-if="showRanking"
                :score="store.score"
                @skip="showRanking = false"
              />

              <template v-if="!showRanking">
                <button class="btn-secondary" @click="showRanking = true">
                  Publicar score
                </button>
                <button class="btn-play" @click="startGame">
                  <span>Jogar de novo</span>
                  <span class="btn-arrow">→</span>
                </button>
              </template>
            </div>
          </div>
        </Transition>

      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import NameCard from './components/NameCard.vue'
import ScoreSubmit from './components/ScoreSubmit.vue'

const store = useGameStore()
const showRanking = ref(false)

// ── Sound System ──────────────────────────────────────
let audioCtx = null

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playNote(freq, dur, type = 'sine', vol = 0.15) {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, c.currentTime)
    gain.gain.setValueAtTime(vol, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + dur)
  } catch (_) {}
}

const sounds = {
  correct: () => {
    playNote(523.25, 0.12, 'sine', 0.14)
    setTimeout(() => playNote(659.25, 0.12, 'sine', 0.14), 90)
    setTimeout(() => playNote(783.99, 0.28, 'sine', 0.14), 180)
  },
  wrong: () => {
    playNote(233.08, 0.3, 'triangle', 0.2)
    setTimeout(() => playNote(207.65, 0.5, 'triangle', 0.14), 220)
  },
  record: () => {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => playNote(f, 0.25, 'sine', 0.14), i * 100)
    )
  },
  click: () => playNote(440, 0.06, 'sine', 0.08),
}

// ── Game Logic ────────────────────────────────────────
const isPlayable = computed(() => store.phase === 'playing')

function cardResult(side) {
  if (store.phase !== 'revealing' && store.phase !== 'gameover') return null
  if (!store.winnerSide) return null
  return side === store.winnerSide ? 'correct' : 'wrong'
}

let advanceTimer = null

function clearTimer() {
  if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null }
}

watch(() => store.phase, (phase) => {
  clearTimer()
  if (phase === 'gameover') showRanking.value = false
  if (phase !== 'revealing') return

  if (store.lastResult === 'correct') sounds.correct()
  else sounds.wrong()

  advanceTimer = setTimeout(() => {
    if (store.lastResult === 'correct') {
      store.nextRound()
    } else {
      store.gameOver()
      if (store.isNewRecord) setTimeout(() => sounds.record(), 400)
    }
  }, 2300)
})

onUnmounted(clearTimer)

function startGame() {
  sounds.click()
  if (audioCtx) audioCtx.resume()
  store.start()
}
</script>
