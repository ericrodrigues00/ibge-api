<template>
  <div class="submit-panel">

    <!-- Step 1: form -->
    <form v-if="state === 'idle'" class="submit-form" @submit.prevent="submit">
      <label class="submit-label" for="player-name">Seu nome</label>
      <input
        id="player-name"
        v-model="playerName"
        class="submit-input"
        type="text"
        maxlength="32"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        placeholder="Como quer aparecer no ranking?"
        autofocus
      />
      <button class="btn-play submit-btn" type="submit" :disabled="!playerName.trim()">
        <span>Publicar score</span>
        <span class="btn-arrow">↑</span>
      </button>
      <button class="btn-skip" type="button" @click="emit('skip')">Pular</button>
    </form>

    <!-- Step 2: loading -->
    <div v-else-if="state === 'submitting'" class="submit-loading">
      <div class="submit-spinner"></div>
      <span>Publicando…</span>
    </div>

    <!-- Step 3: ranking -->
    <div v-else-if="state === 'done'" class="ranking-panel">
      <div class="rank-tabs" role="tablist">
        <button
          role="tab"
          :class="['rank-tab', { active: tab === 'daily' }]"
          @click="tab = 'daily'"
        >Diário</button>
        <button
          role="tab"
          :class="['rank-tab', { active: tab === 'general' }]"
          @click="tab = 'general'"
        >Geral</button>
      </div>

      <ol class="rank-list">
        <li
          v-for="(row, i) in activeRows"
          :key="row.player_name"
          :class="['rank-item', { 'is-self': row.player_name === playerName.trim() }]"
        >
          <span class="rank-pos">{{ i + 1 }}</span>
          <span class="rank-name">{{ row.player_name }}</span>
          <span class="rank-score">{{ row.best_score }}</span>
        </li>
        <li v-if="activeRows.length === 0" class="rank-empty">Nenhum score ainda hoje.</li>
      </ol>
    </div>

    <!-- Step 4: error -->
    <div v-else-if="state === 'error'" class="submit-error">
      <span>Erro ao publicar.</span>
      <button class="btn-skip" @click="submit">Tentar de novo</button>
    </div>

  </div>

  <!-- Trophy celebration — teleported to body to escape card stacking context -->
  <Teleport to="body">
    <div v-if="state === 'daily-champ'" class="trophy-overlay">

      <!-- Particle burst -->
      <div class="trophy-particles-wrap" aria-hidden="true">
        <div
          v-for="p in particles"
          :key="p.id"
          class="trophy-particle"
          :style="{ '--tx': p.tx, '--ty': p.ty, '--delay': p.delay, '--size': p.size, '--color': p.color }"
        ></div>
      </div>

      <!-- Main content -->
      <div class="trophy-stage">
        <div class="trophy-glow" aria-hidden="true"></div>
        <img :src="trophyImg" alt="Troféu" class="trophy-img" />
        <h2 class="trophy-title">Campeão do Dia</h2>
        <p class="trophy-player">{{ playerName.trim() }}</p>
        <p class="trophy-pts">{{ props.score }} {{ props.score === 1 ? 'ponto' : 'pontos' }}</p>
      </div>

      <button class="trophy-continue-btn" @click="proceedToRanking">
        Continuar
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import trophyImg from '../../assets/winner.png'

const props = defineProps({ score: Number })
const emit = defineEmits(['skip'])

const playerName   = ref('')
const state        = ref('idle') // 'idle' | 'submitting' | 'daily-champ' | 'done' | 'error'
const tab          = ref('daily')
const dailyRows    = ref([])
const generalRows  = ref([])
const particles    = ref([])

const activeRows = computed(() =>
  tab.value === 'daily' ? dailyRows.value : generalRows.value
)

// ── Sound: victory fanfare (more elaborate than the existing record sound) ──
function playVictoryFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    // Ascending C major arpeggio — C5 E5 G5 C6 E6 G6
    const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
    melody.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1)
      gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + i * 0.1 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.1 + 0.5)
      osc.start(ctx.currentTime + i * 0.1)
      osc.stop(ctx.currentTime + i * 0.1 + 0.55)
    })
    // Harmony layer (triangle, softer)
    const harmony = [392, 523.25, 659.25, 783.99]
    harmony.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12 + 0.05)
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12 + 0.05)
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + i * 0.12 + 0.07)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.45)
      osc.start(ctx.currentTime + i * 0.12 + 0.05)
      osc.stop(ctx.currentTime + i * 0.12 + 0.5)
    })
  } catch (_) {}
}

// ── Generate burst particles ──
function generateParticles() {
  const colors = ['#fbbf24', '#fde68a', '#f5f3ee', '#ffffff', '#fcd34d']
  particles.value = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2 + (Math.random() * 0.4 - 0.2)
    const dist  = 70 + Math.random() * 110
    return {
      id:    i,
      tx:    `${Math.cos(angle) * dist}px`,
      ty:    `${Math.sin(angle) * dist}px`,
      delay: `${i * 0.025}s`,
      size:  Math.random() > 0.55 ? '9px' : '5px',
      color: colors[Math.floor(Math.random() * colors.length)],
    }
  })
}

// ── Transition from trophy celebration to ranking ──
function proceedToRanking() {
  state.value = 'done'
}

async function submit() {
  if (!playerName.value.trim()) return
  state.value = 'submitting'

  const { error } = await supabase
    .from('scores')
    .insert({ player_name: playerName.value.trim(), score: props.score })

  if (error) {
    state.value = 'error'
    return
  }

  const [daily, general] = await Promise.all([
    supabase.from('daily_ranking').select('*'),
    supabase.from('general_ranking').select('*'),
  ])

  dailyRows.value   = daily.data   ?? []
  generalRows.value = general.data ?? []

  // Check if this player is #1 on the daily ranking
  const isDailyChamp = dailyRows.value[0]?.player_name === playerName.value.trim()

  if (isDailyChamp) {
    generateParticles()
    state.value = 'daily-champ'
    playVictoryFanfare()
  } else {
    state.value = 'done'
  }
}
</script>
