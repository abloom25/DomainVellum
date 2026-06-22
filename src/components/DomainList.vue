<script setup lang="ts">
import type { DomainInfo } from '@/lib/types'
import DomainRow from './DomainRow.vue'

defineProps<{
  domains: DomainInfo[]
  loading: boolean
  retryingDomains: Set<string>
}>()

defineEmits<{ retry: [domain: string] }>()
</script>

<template>
  <section class="section">
    <div class="section-head">
      <span class="section-num mono">01 /</span>
      <h2 class="section-title">域名状态</h2>
      <span class="section-title-en mono">Domains</span>
    </div>
    <div v-if="loading" class="list">
      <div v-for="i in 3" :key="i" class="skeleton-row">
        <div class="skeleton skeleton-domain" />
        <div class="skeleton skeleton-exp" />
        <div class="skeleton skeleton-days" />
        <div class="skeleton skeleton-pill" />
      </div>
    </div>
    <div v-else-if="domains.length === 0" class="state mono">暂无域名</div>
    <ul v-else class="list">
      <DomainRow
        v-for="d in domains"
        :key="d.domain"
        :info="d"
        :retrying="retryingDomains.has(d.domain)"
        @retry="$emit('retry', $event)"
      />
    </ul>
  </section>
</template>

<style scoped>
.state {
  padding: 1.5rem 0.5rem;
  color: var(--muted-2);
  font-size: 0.9rem;
}
.list {
  list-style: none;
}
.skeleton-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 1.25rem;
  padding: 0.85rem 0.5rem;
  border-bottom: 1px solid var(--line);
}
.skeleton {
  background: var(--paper-2);
  border-radius: 2px;
  animation: skeleton-pulse 1.8s ease-in-out infinite;
}
.skeleton-domain {
  height: 1.2rem;
  width: 60%;
}
.skeleton-exp {
  height: 1rem;
  width: 5rem;
}
.skeleton-days {
  height: 1rem;
  width: 4rem;
}
.skeleton-pill {
  height: 1.2rem;
  width: 3.5rem;
}
@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.2;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    opacity: 0.3;
  }
}
</style>
