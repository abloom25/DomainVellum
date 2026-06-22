<script setup lang="ts">
import { useClock } from '@/composables/useClock'

defineProps<{ refreshing: boolean; siteName: string }>()
const emit = defineEmits<{ refresh: [] }>()

const { text } = useClock()
</script>

<template>
  <header class="header">
    <div class="brand">
      <h1 class="title mono">{{ siteName }}</h1>
      <p class="subtitle">
        域名有效期监控看板 <span class="dim">/ Domain Expiry Monitor</span>
      </p>
    </div>
    <div class="header-right">
      <div class="clock mono">
        <span class="time">{{ text }}</span>
        <span class="tz">Asia/Shanghai</span>
      </div>
      <button
        class="refresh-btn mono"
        :disabled="refreshing"
        @click="emit('refresh')"
      >
        {{ refreshing ? '检查中…' : '重新检查' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
}
.title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}
.subtitle {
  color: var(--muted);
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
.dim {
  color: var(--muted-2);
}
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}
.clock {
  text-align: right;
  font-size: 0.9rem;
}
.time {
  color: var(--ink);
}
.tz {
  display: block;
  color: var(--muted-2);
  font-size: 0.7rem;
  margin-top: 0.15rem;
}
.refresh-btn {
  font-size: 0.8rem;
  padding: 0.3rem 0.8rem;
  color: var(--muted);
  border-color: var(--line-strong);
}
.refresh-btn:hover:not(:disabled) {
  color: var(--ink);
}
@media (max-width: 768px) {
  .header {
    flex-direction: column;
  }
  .header-right {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .clock {
    text-align: left;
  }
}
</style>
