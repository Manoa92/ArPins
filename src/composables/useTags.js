// composables/useTags.js
import { reactive } from 'vue'

let _id = 0

export function useTags() {
  const tags = reactive([])

  /**
   * Crée un tag depuis une détection COCO-SSD.
   * @param {Object} detection  - objet détecté { class, score, bbox }
   * @param {number} canvasW    - largeur du canvas natif
   * @param {number} canvasH    - hauteur du canvas natif
   */
  /**
   * Crée un tag depuis une détection COCO-SSD.
   * @param {Object} detection  - objet détecté { class, score, bbox }
   * @param {number} canvasW    - largeur du canvas natif
   * @param {number} canvasH    - hauteur du canvas natif
   * @param {string|null} overrideLabel - libellé fourni par l'utilisateur (ou null pour auto)
   */
  function addTag(detection, canvasW, canvasH, overrideLabel = null) {
    const [bx, by, bw, bh] = detection.bbox
    const cx = bx + bw / 2
    const cy = by + bh / 2

    // Calcul du label final (priorité à override)
    let label
    if (overrideLabel) {
      label = overrideLabel
    } else {
      // Compter combien de tags du même type existent déjà
      const count = tags.filter(t => t.detectedClass === detection.class).length
      label = count > 0 ? `${detection.class} ${count + 1}` : detection.class
    }

    tags.push({
      id: ++_id,
      label,
      detectedClass: detection.class,
      // Coordonnées normalisées [0-1] — indépendantes de la résolution
      normX: cx / canvasW,
      normY: cy / canvasH,
      // Position écran calculée à chaque frame
      screenX: 0,
      screenY: 0,
      confidence: detection.score,
      visible: true,
      isManual: false,
    })

    return label
  }

  /**
   * Crée un tag manuel à une position cliquée.
   * @param {number} cx - coordonnée X du clic (en pixels canvas)
   * @param {number} cy - coordonnée Y du clic (en pixels canvas)
   * @param {number} canvasW - largeur du canvas natif
   * @param {number} canvasH - hauteur du canvas natif
   * @param {string} className - nom de la classe (par défaut "Zone")
   */
  function addManualTag(cx, cy, canvasW, canvasH, className = 'Zone') {
    const count = tags.filter(t => t.detectedClass === className).length
    const label = count > 0 ? `${className} ${count + 1}` : className

    tags.push({
      id: ++_id,
      label,
      detectedClass: className,
      normX: cx / canvasW,
      normY: cy / canvasH,
      screenX: 0,
      screenY: 0,
      confidence: 1.0,
      visible: true,
      isManual: true,
    })

    return label
  }

  function removeTag(id) {
    const idx = tags.findIndex(t => t.id === id)
    if (idx !== -1) tags.splice(idx, 1)
  }

  /**
   * Met à jour la position des tags en fonction des nouvelles détections.
   * Utilise la distance euclidienne pour associer chaque tag à la détection la plus proche.
   */
  function updateTagPositions(detections, canvasW, canvasH, zoneW, zoneH) {
    for (const tag of tags) {
      // Les tags manuels ne bougent pas : leur position normalisée fixe suffit.
      if (tag.isManual) {
        tag.visible = true
        tag.screenX = tag.normX * zoneW
        tag.screenY = tag.normY * zoneH
        continue
      }

      let best = null
      let bestDist = Infinity
      const MAX_DIST = Math.max(canvasW, canvasH) * 0.45

      for (const d of detections) {
        if (d.class !== tag.detectedClass) continue
        const [bx, by, bw, bh] = d.bbox
        const cx = bx + bw / 2
        const cy = by + bh / 2
        const origX = tag.normX * canvasW
        const origY = tag.normY * canvasH
        const dist = Math.hypot(cx - origX, cy - origY)
        if (dist < bestDist) {
          bestDist = dist
          best = d
        }
      }

      if (best && bestDist < MAX_DIST) {
        const [bx, by, bw, bh] = best.bbox
        tag.normX = (bx + bw / 2) / canvasW
        tag.normY = (by + bh / 2) / canvasH
        tag.confidence = best.score
        tag.visible = true
      } else {
        tag.visible = false
      }

      // Coordonnées en pixels relatifs à la zone affichée
      tag.screenX = tag.normX * zoneW
      tag.screenY = tag.normY * zoneH
    }
  }

  return { tags, addTag, addManualTag, removeTag, updateTagPositions }
}
