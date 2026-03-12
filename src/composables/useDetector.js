// composables/useDetector.js
import { ref, onUnmounted } from 'vue'

export function useDetector() {
  const status = ref('idle')   // idle | loading | ready | error
  const detections = ref([])
  let model = null
  let animFrame = null
  let videoSource = null

  async function loadModel() {
    status.value = 'loading'
    try {
      // Import dynamique pour ne pas bloquer le chargement initial
      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      // S'assurer que tfjs est initialisé
      await import('@tensorflow/tfjs')
      model = await cocoSsd.load()
      status.value = 'ready'
    } catch (e) {
      status.value = 'error'
      throw e
    }
  }

  function startDetectionLoop(video) {
    videoSource = video
    loop()
  }

  async function loop() {
    if (!model || !videoSource || videoSource.readyState < 2) {
      animFrame = requestAnimationFrame(loop)
      return
    }
    try {
      detections.value = await model.detect(videoSource)
    } catch (_) {
      // Frame ignorée si erreur
    }
    animFrame = requestAnimationFrame(loop)
  }

  function stopDetectionLoop() {
    if (animFrame) cancelAnimationFrame(animFrame)
    animFrame = null
  }

  onUnmounted(stopDetectionLoop)

  return { status, detections, loadModel, startDetectionLoop, stopDetectionLoop }
}
