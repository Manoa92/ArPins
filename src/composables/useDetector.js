// composables/useDetector.js
import { ref, onUnmounted } from 'vue'

export function useDetector() {
  const status = ref('idle')   // idle | loading | ready | error
  const detections = ref([])
  const depthMap = ref(null)      // Tensor ou structure retournée par le modèle de profondeur

  let model = null
  let depthModel = null
  let animFrame = null
  let videoSource = null

  /**
   * Charge les modèles nécessaires (détection et estimation de profondeur).
   * Le partage TFJS se fait automatiquement.
   */
  async function loadModels() {
    status.value = 'loading'
    try {
      const [{ default: tf }] = await Promise.all([
        import('@tensorflow/tfjs'),
      ])

      // modèle de détection COCO-SSD
      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      model = await cocoSsd.load()

      // modèle d'estimation de profondeur (MiDaS ou autre)
      const depthEst = await import('@tensorflow-models/depth-estimation')
      depthModel = await depthEst.createEstimator('midas')

      status.value = 'ready'
    } catch (e) {
      status.value = 'error'
      console.error('Erreur chargement modèles', e)
      throw e
    }
  }

  function startDetectionLoop(video) {
    videoSource = video
    loop()
  }

  async function loop() {
    if ((!model && !depthModel) || !videoSource || videoSource.readyState < 2) {
      animFrame = requestAnimationFrame(loop)
      return
    }

    try {
      if (model) {
        detections.value = await model.detect(videoSource)
      }
      if (depthModel) {
        // l'estimateDepth renvoie un objet {depthMap, width, height,...}
        const pred = await depthModel.estimateDepth(videoSource)
        depthMap.value = pred
      }
    } catch (err) {
      // ignorer erreurs temporaires
      console.warn('détection/ profondeur échouée', err)
    }

    animFrame = requestAnimationFrame(loop)
  }

  function stopDetectionLoop() {
    if (animFrame) cancelAnimationFrame(animFrame)
    animFrame = null
  }

  /**
   * Retourne la profondeur estimée (en unités arbitraires) au point normalisé (0‑1)
   */
  function getDepthAt(normX, normY) {
    if (!depthMap.value) return null
    const { width, height, depthMap: dm } = depthMap.value
    // depthMap may be a tf.Tensor or plain array
    let x = Math.floor(normX * width)
    let y = Math.floor(normY * height)
    x = Math.min(Math.max(x, 0), width - 1)
    y = Math.min(Math.max(y, 0), height - 1)

    if (dm.get) {
      return dm.get(y, x)
    }
    // else assume flattened Float32Array
    return dm[y * width + x]
  }

  onUnmounted(stopDetectionLoop)

  return { status, detections, depthMap, loadModels, loadModel: loadModels, startDetectionLoop, stopDetectionLoop, getDepthAt }
}
