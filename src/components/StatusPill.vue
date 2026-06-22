<script setup lang="ts">
import type { DomainStatus } from '@/lib/types'

defineProps<{ status: DomainStatus }>()

const LABELS: Record<DomainStatus, string> = {
  expired: '已过期',
  critical: '紧急',
  warning: '即将到期',
  normal: '正常',
  unknown: '未知',
}
</script>

<template>
  <span class="pill" :class="`pill-${status}`">{{ LABELS[status] }}</span>
</template>

<style scoped>
.pill {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  font-size: 0.7rem;
  font-family: var(--font-mono);
  border: 1px solid;
  border-radius: 2px;
  white-space: nowrap;
}
.pill-expired {
  color: var(--status-expired);
  border-color: var(--status-expired);
}
.pill-critical {
  color: var(--status-critical);
  border-color: var(--status-critical);
}
.pill-warning {
  color: var(--status-warning);
  border-color: var(--status-warning);
}
.pill-normal {
  color: var(--status-normal);
  border-color: var(--status-normal);
}
.pill-unknown {
  color: var(--status-unknown);
  border-color: var(--status-unknown);
}
</style>
