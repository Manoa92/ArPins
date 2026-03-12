<template>
  <div
    class="ar-tag"
    :class="visible ? 'ar-tag--visible' : 'ar-tag--hidden'"
    :style="{ left: `${x}px`, top: `${y}px` }"
  >
    <div class="ar-tag__bubble">
      <span class="ar-tag__dot" />
      <span class="ar-tag__label">{{ label }}</span>
      <span class="ar-tag__conf">{{ pct }}%</span>
    </div>
    <div class="ar-tag__stem" />
    <div class="ar-tag__anchor" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  visible: { type: Boolean, default: true },
})

const pct = computed(() => Math.round(props.confidence * 100))
</script>

<style scoped>
.ar-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  pointer-events: none;
  transition: opacity 0.25s ease;
  will-change: transform, left, top;
}

.ar-tag--visible { opacity: 1; }
.ar-tag--hidden  { opacity: 0.3; }

.ar-tag__bubble {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  background: rgba(0, 229, 255, 0.1);
  border: 1px solid var(--accent);
  border-radius: 4px;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 16px rgba(0, 229, 255, 0.2), inset 0 0 8px rgba(0, 229, 255, 0.05);
  white-space: nowrap;
}

.ar-tag--hidden .ar-tag__bubble {
  border-color: var(--muted);
  background: rgba(61, 85, 102, 0.15);
  box-shadow: none;
}

.ar-tag__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
  flex-shrink: 0;
  animation: blink 2s infinite;
}

.ar-tag--hidden .ar-tag__dot {
  background: var(--muted);
  box-shadow: none;
  animation: none;
}

.ar-tag__label {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ar-tag--hidden .ar-tag__label { color: var(--muted); }

.ar-tag__conf {
  font-family: 'Space Mono', monospace;
  font-size: 0.55rem;
  color: var(--muted);
}

.ar-tag__stem {
  width: 1px;
  height: 14px;
  background: linear-gradient(to bottom, var(--accent), transparent);
  margin: 0 auto;
}

.ar-tag--hidden .ar-tag__stem {
  background: linear-gradient(to bottom, var(--muted), transparent);
}

.ar-tag__anchor {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  background: var(--accent-dim);
  margin: 0 auto;
}

.ar-tag--hidden .ar-tag__anchor { border-color: var(--muted); background: transparent; }

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}
</style>
