<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <div class="app-header__brand">
        <span class="app-header__icon">⬡</span>
        <span class="app-header__name">AR Tagger</span>
      </div>
      <span class="app-header__status" :class="`app-header__status--${statusClass}`">
        {{ statusText }}
      </span>
    </header>

    <!-- Main -->
    <main class="app-main">
      <CameraView
        ref="cameraViewRef"
        :started="isStreaming"
        :detections="detections"
        :tags="tags"
        :error-msg="cameraError || ''"
        @start="handleStart"
        @click-detection="handleClickDetection"
      />

      <TagPanel
        :tags="tags"
        @remove="removeTag"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import CameraView from './components/CameraView.vue'
import TagPanel   from './components/TagPanel.vue'
import { useCamera }   from './composables/useCamera.js'
import { useDetector } from './composables/useDetector.js'
import { useTags }     from './composables/useTags.js'

// ─── Composables ──────────────────────────────────────────────────────────
const { videoEl: cameraVideoRef, isStreaming, error: cameraError, startCamera } = useCamera()
const { status: modelStatus, detections, loadModel, startDetectionLoop } = useDetector()
const { tags, addTag, removeTag, updateTagPositions } = useTags()

// ─── Ref vers CameraView (pour accéder à videoEl exposé) ──────────────────
const cameraViewRef = ref(null)

// ─── Status bar ──────────────────────────────────────────────────────────
const statusText = computed(() => {
  if (!isStreaming.value) return 'EN ATTENTE'
  if (modelStatus.value === 'loading') return 'CHARGEMENT IA…'
  if (modelStatus.value === 'ready')   return 'DÉTECTION ACTIVE'
  if (modelStatus.value === 'error')   return 'ERREUR IA'
  return '—'
})

const statusClass = computed(() => {
  if (modelStatus.value === 'ready') return 'ready'
  if (modelStatus.value === 'error') return 'error'
  return 'loading'
})

// ─── Lancement ────────────────────────────────────────────────────────────
async function handleStart() {
  // Brancher le videoEl du CameraView dans le composable useCamera
  cameraVideoRef.value = cameraViewRef.value.videoEl

  await startCamera()

  // Redimensionner les canvas une fois la vidéo prête
  cameraViewRef.value.resizeCanvases()

  // Charger le modèle TF et démarrer la boucle de détection
  await loadModel()
  startDetectionLoop(cameraVideoRef.value)
}

// ─── Clic sur objet détecté ──────────────────────────────────────────────
function handleClickDetection({ detection, canvasW, canvasH }) {
  const label = addTag(detection, canvasW, canvasH)
  cameraViewRef.value.showToast(`Tag créé : « ${label} »`)
}

// ─── Mise à jour des positions (sync avec detections) ────────────────────
let rafId = null

function positionLoop() {
  if (cameraViewRef.value && isStreaming.value) {
    const zone = cameraViewRef.value.zoneEl
    const video = cameraViewRef.value.videoEl

    if (zone && video) {
      const zoneRect = zone.getBoundingClientRect()
      updateTagPositions(
        detections.value,
        video.videoWidth  || video.clientWidth,
        video.videoHeight || video.clientHeight,
        zoneRect.width,
        zoneRect.height,
      )
    }
  }
  rafId = requestAnimationFrame(positionLoop)
}

// Démarrer la boucle de position dès que le stream est actif
watch(isStreaming, (val) => {
  if (val) positionLoop()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  border-bottom: 1px solid var(--border);
  background: rgba(7, 10, 13, 0.9);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  z-index: 10;
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-header__icon {
  color: var(--accent);
  font-size: 1.2rem;
  filter: drop-shadow(0 0 6px var(--accent));
}

.app-header__name {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.app-header__status {
  font-family: 'Space Mono', monospace;
  font-size: 0.62rem;
  padding: 3px 12px;
  border-radius: 100px;
  border: 1px solid currentColor;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.app-header__status--loading {
  color: var(--warn);
  animation: pulse 1.2s infinite;
}

.app-header__status--ready   { color: var(--success); }
.app-header__status--error   { color: var(--danger); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
