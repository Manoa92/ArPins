<template>
  <div ref="zoneEl" class="camera-view">
    <!-- Scanlines déco -->
    <div class="camera-view__scanlines" aria-hidden="true" />

    <!-- Stream vidéo -->
    <video
      ref="videoEl"
      class="camera-view__video"
      autoplay
      playsinline
      muted
    />

    <!-- Canvas : boîtes de détection -->
    <canvas ref="boxCanvas" class="camera-view__canvas camera-view__canvas--boxes" />

    <!-- Canvas cliquable -->
    <canvas
      ref="clickCanvas"
      class="camera-view__canvas camera-view__canvas--click"
      @click="onCanvasClick"
    />

    <!-- Tags HTML flottants -->
    <ArTag
      v-for="tag in tags"
      :key="tag.id"
      :label="tag.label"
      :x="tag.screenX"
      :y="tag.screenY"
      :confidence="tag.confidence"
      :visible="tag.visible"
    />

    <!-- Toast notification -->
    <Transition name="toast">
      <div v-if="toast" class="camera-view__toast">{{ toast }}</div>
    </Transition>

    <!-- Overlay démarrage -->
    <Transition name="fade">
      <div v-if="!started" class="camera-view__start">
        <div class="start-card">
          <div class="start-card__icon">⬡</div>
          <h2 class="start-card__title">AR Object Tagger</h2>
          <p class="start-card__desc">
            Pointez votre caméra vers une pièce.<br>
            Cliquez sur un objet pour lui coller un tag.<br>
            Le tag le suivra en temps réel.
          </p>
          <button class="start-card__btn" @click="$emit('start')">
            Activer la caméra
          </button>
          <p v-if="errorMsg" class="start-card__error">{{ errorMsg }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import ArTag from './ArTag.vue'

// ─── Props & Emits ─────────────────────────────────────────────────────────
const props = defineProps({
  started:    { type: Boolean, default: false },
  detections: { type: Array,   default: () => [] },
  tags:       { type: Array,   required: true },
  errorMsg:   { type: String,  default: '' },
})

const emit = defineEmits(['start', 'click-detection'])

// ─── Refs ──────────────────────────────────────────────────────────────────
const zoneEl    = ref(null)
const videoEl   = ref(null)
const boxCanvas = ref(null)
const clickCanvas = ref(null)

const toast = ref('')
let toastTimer = null

// ─── Redimensionnement ────────────────────────────────────────────────────
function resizeCanvases() {
  const v = videoEl.value
  if (!v) return
  const w = v.videoWidth  || v.clientWidth
  const h = v.videoHeight || v.clientHeight
  ;[boxCanvas.value, clickCanvas.value].forEach(c => {
    if (!c) return
    c.width  = w
    c.height = h
  })
}

window.addEventListener('resize', resizeCanvases)
onUnmounted(() => window.removeEventListener('resize', resizeCanvases))

// ─── Dessin des boîtes ────────────────────────────────────────────────────
watch(() => props.detections, drawBoxes)

function drawBoxes() {
  const canvas = boxCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const d of props.detections) {
    const [x, y, w, h] = d.bbox
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)'
    ctx.lineWidth   = 1.5
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
  }
}

// ─── Clic sur canvas ─────────────────────────────────────────────────────
function onCanvasClick(event) {
  const canvas = clickCanvas.value
  if (!canvas) return

  const rect  = canvas.getBoundingClientRect()
  const scaleX = canvas.width  / rect.width
  const scaleY = canvas.height / rect.height
  const cx     = (event.clientX - rect.left)  * scaleX
  const cy     = (event.clientY - rect.top)   * scaleY

  // Trouver l'objet le plus petit qui contient le clic (évite les grands faux-positifs)
  let hit = null
  let minArea = Infinity

  for (const d of props.detections) {
    const [bx, by, bw, bh] = d.bbox
    if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) {
      const area = bw * bh
      if (area < minArea) { minArea = area; hit = d }
    }
  }

  if (hit) {
    emit('click-detection', {
      detection: hit,
      canvasW: canvas.width,
      canvasH: canvas.height,
    })
  } else {
    showToast('Aucun objet ici — réessayez')
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2500)
}

defineExpose({ videoEl, zoneEl, resizeCanvases, showToast })
</script>

<style scoped>
.camera-view {
  position: relative;
  flex: 1;
  background: #000;
  overflow: hidden;
}

.camera-view__scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 229, 255, 0.012) 2px,
    rgba(0, 229, 255, 0.012) 4px
  );
  pointer-events: none;
  z-index: 1;
}

.camera-view__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.camera-view__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.camera-view__canvas--boxes { pointer-events: none; z-index: 2; }
.camera-view__canvas--click { cursor: crosshair;    z-index: 3; }

/* Toast */
.camera-view__toast {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 229, 255, 0.12);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-family: 'Space Mono', monospace;
  font-size: 0.68rem;
  padding: 8px 18px;
  border-radius: 4px;
  z-index: 20;
  pointer-events: none;
  white-space: nowrap;
  letter-spacing: 0.04em;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from  { opacity: 0; transform: translateX(-50%) translateY(8px); }
.toast-leave-to    { opacity: 0; transform: translateX(-50%) translateY(-4px); }

/* Start overlay */
.camera-view__start {
  position: absolute;
  inset: 0;
  background: rgba(7, 10, 13, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.35s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.start-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 0 24px;
  max-width: 340px;
}

.start-card__icon {
  font-size: 2.5rem;
  color: var(--accent);
  line-height: 1;
  filter: drop-shadow(0 0 12px var(--accent));
}

.start-card__title {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--text);
}

.start-card__desc {
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.7;
}

.start-card__btn {
  padding: 11px 30px;
  background: transparent;
  border: 1.5px solid var(--accent);
  color: var(--accent);
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s, box-shadow 0.2s;
}

.start-card__btn:hover {
  background: rgba(0, 229, 255, 0.1);
  box-shadow: 0 0 18px rgba(0, 229, 255, 0.25);
}

.start-card__error {
  color: var(--danger);
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
}
</style>
