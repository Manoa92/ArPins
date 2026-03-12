// composables/useCamera.js
import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const videoEl = ref(null)
  const isStreaming = ref(false)
  const error = ref(null)

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (!videoEl.value) throw new Error('Élément vidéo introuvable')

      videoEl.value.srcObject = stream

      await new Promise((resolve, reject) => {
        videoEl.value.onloadedmetadata = resolve
        videoEl.value.onerror = reject
      })

      await videoEl.value.play()
      isStreaming.value = true
    } catch (e) {
      error.value = e.message || 'Impossible d\'accéder à la caméra'
      throw e
    }
  }

  function stopCamera() {
    const stream = videoEl.value?.srcObject
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      videoEl.value.srcObject = null
    }
    isStreaming.value = false
  }

  onUnmounted(stopCamera)

  return { videoEl, isStreaming, error, startCamera, stopCamera }
}
