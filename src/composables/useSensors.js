import { ref, onUnmounted } from 'vue'

/**
 * Hook simple pour exposer les données d'orientation et de rotation
 * fournies par les capteurs (gyroscope / accéléromètre) du dispositif.
 * Ne fonctionne que sur supports mobiles ou navigateurs compatibles.
 */
export function useSensors() {
  const orientation = ref({ alpha: 0, beta: 0, gamma: 0 })
  const rotationRate = ref({ alpha: 0, beta: 0, gamma: 0 })

  function handleOrientation(e) {
    orientation.value = {
      alpha: e.alpha || 0,
      beta: e.beta || 0,
      gamma: e.gamma || 0,
    }
  }

  function handleMotion(e) {
    if (e.rotationRate) {
      rotationRate.value = {
        alpha: e.rotationRate.alpha || 0,
        beta: e.rotationRate.beta || 0,
        gamma: e.rotationRate.gamma || 0,
      }
    }
  }

  window.addEventListener('deviceorientation', handleOrientation)
  window.addEventListener('devicemotion', handleMotion)

  onUnmounted(() => {
    window.removeEventListener('deviceorientation', handleOrientation)
    window.removeEventListener('devicemotion', handleMotion)
  })

  return { orientation, rotationRate }
}
