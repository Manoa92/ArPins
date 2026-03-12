<template>
  <aside class="tag-panel">
    <div class="tag-panel__header">
      <span class="tag-panel__title">Objets tagués</span>
      <span class="tag-panel__count">{{ tags.length }}</span>
    </div>

    <div class="tag-panel__list">
      <p v-if="tags.length === 0" class="tag-panel__empty">
        Cliquez sur un objet dans la caméra pour créer un tag.
      </p>

      <div
        v-for="tag in tags"
        :key="tag.id"
        class="tag-item"
      >
        <span class="tag-item__status" :class="tag.visible ? 'tag-item__status--on' : 'tag-item__status--off'" />
        <div class="tag-item__body">
          <div class="tag-item__name">{{ tag.label }}</div>
          <div class="tag-item__meta">
            Confiance: {{ Math.round(tag.confidence * 100) }}% ·
            {{ tag.visible ? 'Dans le champ' : 'Hors champ' }}
          </div>
        </div>
        <button class="tag-item__delete" @click="$emit('remove', tag.id)" title="Supprimer">✕</button>
      </div>
    </div>

    <div class="tag-panel__footer">
      <span class="tag-panel__hint"><em>Clic</em> sur un objet détecté pour le taguer</span>
      <span class="tag-panel__hint"><em>Auto</em> suivi en temps réel</span>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  tags: { type: Array, required: true },
})

defineEmits(['remove'])
</script>

<style scoped>
.tag-panel {
  width: 230px;
  flex-shrink: 0;
  background: var(--surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tag-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.tag-panel__title {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
  font-family: 'Space Mono', monospace;
}

.tag-panel__count {
  font-family: 'Space Mono', monospace;
  font-size: 0.7rem;
  color: var(--accent);
  background: var(--accent-dim);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 1px 8px;
}

.tag-panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.tag-panel__list::-webkit-scrollbar { width: 3px; }
.tag-panel__list::-webkit-scrollbar-thumb { background: var(--muted); border-radius: 2px; }

.tag-panel__empty {
  padding: 20px 8px;
  text-align: center;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.65;
}

.tag-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 10px;
  border: 1px solid rgba(0, 229, 255, 0.12);
  border-radius: 6px;
  background: rgba(0, 229, 255, 0.025);
  transition: border-color 0.2s, background 0.2s;
}

.tag-item:hover {
  border-color: rgba(0, 229, 255, 0.35);
  background: rgba(0, 229, 255, 0.055);
}

.tag-item__status {
  margin-top: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-item__status--on  { background: var(--success); box-shadow: 0 0 6px var(--success); }
.tag-item__status--off { background: var(--muted); }

.tag-item__body { flex: 1; min-width: 0; }

.tag-item__name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text);
  text-transform: capitalize;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-item__meta {
  font-family: 'Space Mono', monospace;
  font-size: 0.58rem;
  color: var(--muted);
  line-height: 1.5;
}

.tag-item__delete {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 0.65rem;
  opacity: 0.4;
  transition: opacity 0.2s;
  padding: 2px 4px;
  flex-shrink: 0;
}

.tag-item__delete:hover { opacity: 1; }

.tag-panel__footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-panel__hint {
  font-family: 'Space Mono', monospace;
  font-size: 0.58rem;
  color: var(--muted);
  line-height: 1.6;
}

.tag-panel__hint em {
  font-style: normal;
  color: var(--accent);
}
</style>
