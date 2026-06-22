<script setup lang="ts">
import { computed } from 'vue'
import type { DomainInfo } from '@/lib/types'

const props = defineProps<{ domains: DomainInfo[] }>()

const stats = computed(() => {
  const total = props.domains.length
  const normal = props.domains.filter((d) => d.status === 'normal').length
  const warning = props.domains.filter((d) => d.status === 'warning').length
  const urgent = props.domains.filter(
    (d) => d.status === 'expired' || d.status === 'critical',
  ).length
  const unknown = props.domains.filter((d) => d.status === 'unknown').length
  return { total, normal, warning, urgent, unknown }
})
</script>

<template>
  <section class="section">
    <div class="section-head">
      <span class="section-num mono">02 /</span>
      <h2 class="section-title">概览</h2>
      <span class="section-title-en mono">Summary</span>
    </div>
    <div class="grid">
      <div class="stat">
        <span class="num mono">{{ stats.total }}</span>
        <span class="label">总数 / Total</span>
      </div>
      <div class="stat">
        <span class="num mono" style="color: var(--status-normal)">{{ stats.normal }}</span>
        <span class="label">正常 / OK</span>
      </div>
      <div class="stat">
        <span class="num mono" style="color: var(--status-warning)">{{ stats.warning }}</span>
        <span class="label">即将到期 / Soon</span>
      </div>
      <div class="stat">
        <span class="num mono" style="color: var(--status-expired)">{{ stats.urgent }}</span>
        <span class="label">紧急 / Urgent</span>
      </div>
      <div class="stat">
        <span class="num mono" style="color: var(--status-unknown)">{{ stats.unknown }}</span>
        <span class="label">失败 / Failed</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  background: var(--line);
  border: 1px solid var(--line);
}
.stat {
  background: var(--paper);
  padding: 1.25rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.num {
  font-size: 1.8rem;
  font-weight: 600;
  line-height: 1;
}
.label {
  font-size: 0.7rem;
  color: var(--muted);
}
@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .num {
    font-size: 1.4rem;
  }
}
</style>
