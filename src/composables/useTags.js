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
  function addTag(detection, canvasW, canvasH, overrideLabel = null, extra = {}) {
    const [bx, by, bw, bh] = detection.bbox
    const cx = bx + bw / 2
    const cy = by + bh / 2

    // Calcul du label final (priorité à override)
    let label
    if (overrideLabel) {
      label = overrideLabel
    } else {
      const count = tags.filter(t => t.detectedClass === detection.class).length
      label = count > 0 ? `${detection.class} ${count + 1}` : detection.class
    }

    tags.push({
      id: ++_id,
      label,
      detectedClass: detection.class,
      normX: cx / canvasW,
      normY: cy / canvasH,
      screenX: 0,
      screenY: 0,
      confidence: detection.score,
      visible: true,
      isManual: false,
      ...extra, // depth, orientation, etc.
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
  function addManualTag(cx, cy, canvasW, canvasH, className = 'Zone', template = null) {
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
      template,
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
  // recherche de correspondance par template dans l'image
  function matchTemplate(frame, template, prevX, prevY) {
    if (!frame || !template) return null
    const fw = frame.width
    const fh = frame.height
    const tw = template.width
    const th = template.height
    const data = frame.data
    const tdata = template.data
    let best = { x: prevX, y: prevY, score: Infinity }

    const radius = Math.max(fw, fh) * 0.3
    const startY = Math.max(0, prevY - radius)
    const endY = Math.min(fh - th, prevY + radius)
    const startX = Math.max(0, prevX - radius)
    const endX = Math.min(fw - tw, prevX + radius)

    for (let y = startY; y <= endY; y += 4) {
      for (let x = startX; x <= endX; x += 4) {
        let s = 0
        for (let ty = 0; ty < th; ty++) {
          const fy = (y + ty) * fw
          const tyOff = ty * tw
          for (let tx = 0; tx < tw; tx++) {
            const fi = (fy + x + tx) * 4
            const ti = (tyOff + tx) * 4
            for (let c = 0; c < 3; c++) {
              const diff = data[fi + c] - tdata[ti + c]
              s += diff * diff
            }
          }
        }
        if (s < best.score) {
          best = { x, y, score: s }
        }
      }
    }
    return best
  }

  function updateTagPositions(detections, canvasW, canvasH, zoneW, zoneH, frame) {
    for (const tag of tags) {
      // Tags manuels : recherche par template
      if (tag.isManual) {
        if (tag.template) {
          const prevX = tag.normX * canvasW - tag.template.width / 2
          const prevY = tag.normY * canvasH - tag.template.height / 2
          const result = matchTemplate(frame, tag.template, prevX, prevY)
          if (result && result.score < Infinity) {
            // mettre à jour centre normalisé
            tag.normX = (result.x + tag.template.width / 2) / canvasW
            tag.normY = (result.y + tag.template.height / 2) / canvasH
            tag.visible = true
          } else {
            tag.visible = false
          }
        } else {
          // pas de template (cas improbable) -> reste statique
          tag.visible = true
        }
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
