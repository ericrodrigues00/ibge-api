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
</template>

<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({ score: Number })
const emit = defineEmits(['skip'])

const playerName = ref('')
const state = ref('idle') // 'idle' | 'submitting' | 'done' | 'error'
const tab = ref('daily')
const dailyRows = ref([])
const generalRows = ref([])

const activeRows = computed(() =>
  tab.value === 'daily' ? dailyRows.value : generalRows.value
)

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

  dailyRows.value = daily.data ?? []
  generalRows.value = general.data ?? []
  state.value = 'done'
}
</script>
