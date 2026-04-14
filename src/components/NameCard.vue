<template>
  <div
    class="name-card"
    :class="[result, { clickable: canClick }]"
    @click="handleClick"
    :role="canClick ? 'button' : undefined"
    :tabindex="canClick ? 0 : -1"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- Top accent bar -->
    <div class="card-accent-bar"></div>

    <div class="card-inner">
      <!-- Rank badge: only shown when revealed -->
      <div class="card-rank" :class="{ visible: card?.revealed }">
        <span>#{{ card?.rank }}</span>
      </div>

      <!-- Name -->
      <div class="card-name">{{ displayName }}</div>

      <!-- Frequency block: always in layout, hidden until revealed -->
      <div class="card-freq-block" :class="{ revealed: card?.revealed }">
        <span class="freq-number">{{ displayFreq }}</span>
        <span class="freq-label">pessoas</span>
      </div>


    </div>

    <!-- Click hint -->
    <div class="card-hint" :class="{ visible: canClick }">
      clique para escolher
    </div>

    <!-- Result icon -->
    <Transition name="result-pop">
      <div v-if="result" class="result-icon" :class="result">
        {{ result === 'correct' ? '✓' : '✕' }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  card: { type: Object, default: null },
  result: { type: String, default: null },
  canClick: { type: Boolean, default: false },
})

const emit = defineEmits(['choose'])

const animatedFreq = ref(0)
let animFrame = null

const displayName = computed(() => {
  if (!props.card) return '...'
  const n = props.card.nome
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
})

const displayFreq = computed(() => {
  return Math.round(animatedFreq.value).toLocaleString('pt-BR')
})

function handleClick() {
  if (props.canClick) emit('choose')
}

function animateTo(target) {
  const startVal = animatedFreq.value
  const startTime = performance.now()
  const duration = 1400 // ms

  function tick(now) {
    const t = Math.min((now - startTime) / duration, 1)
    const eased = 1 - (1 - t) ** 3 // ease out cubic
    animatedFreq.value = startVal + (target - startVal) * eased
    if (t < 1) {
      animFrame = requestAnimationFrame(tick)
    } else {
      animatedFreq.value = target
    }
  }

  if (animFrame) cancelAnimationFrame(animFrame)
  animFrame = requestAnimationFrame(tick)
}

watch(() => props.card?.revealed, (revealed) => {
  if (revealed && props.card) {
    animateTo(props.card.frequencia)
  }
})

watch(() => props.card?.nome, () => {
  if (animFrame) cancelAnimationFrame(animFrame)
  animatedFreq.value = 0
}, { flush: 'pre' })

onMounted(() => {
  if (props.card?.revealed) {
    animatedFreq.value = props.card.frequencia
  }
})

onBeforeUnmount(() => {
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>
