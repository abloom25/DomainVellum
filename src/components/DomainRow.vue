<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DomainInfo } from '@/lib/types'
import StatusPill from './StatusPill.vue'

const props = defineProps<{
  info: DomainInfo
  retrying: boolean
}>()

const emit = defineEmits<{ retry: [domain: string] }>()

const expanded = ref(false)

const TENCENT_RENEW_URL = 'https://console.cloud.tencent.com/domain/renew'
const DAY_MS = 24 * 60 * 60 * 1000

function toggle(): void {
  expanded.value = !expanded.value
}

const expirationDisplay = computed(() =>
  props.info.expirationDate ? props.info.expirationDate.slice(0, 10) : '—',
)

const daysDisplay = computed(() => {
  const d = props.info.daysRemaining
  if (d === null) return '—'
  return d < 0 ? `${-d} 天前` : `${d} 天`
})

const progress = computed(() => {
  if (!props.info.registrationDate || !props.info.expirationDate) return null
  const reg = new Date(props.info.registrationDate).getTime()
  const exp = new Date(props.info.expirationDate).getTime()
  if (Number.isNaN(reg) || Number.isNaN(exp) || exp <= reg) return null
  const now = Date.now()
  return Math.min(1, Math.max(0, (now - reg) / (exp - reg)))
})

const ownedDays = computed(() => {
  if (!props.info.registrationDate) return null
  const reg = new Date(props.info.registrationDate).getTime()
  if (Number.isNaN(reg)) return null
  return Math.floor((Date.now() - reg) / DAY_MS)
})

const dnssecText = computed(() => {
  if (props.info.dnssec === null) return '未知'
  return props.info.dnssec ? '已启用' : '未启用'
})

function retry(): void {
  emit('retry', props.info.domain)
}
</script>

<template>
  <li
    class="row"
    :class="{ expanded }"
    tabindex="0"
    :aria-expanded="expanded"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <div class="main">
      <div class="domain-col">
        <span class="domain mono">{{ info.domain }}</span>
        <span v-if="info.registrar" class="registrar">
          {{ info.registrar }}
          <span v-if="info.isTencent" class="badge">腾讯云</span>
        </span>
        <span v-else class="registrar dim">注册商未知</span>
      </div>
      <div class="exp-days">
        <span class="exp-col mono">{{ expirationDisplay }}</span>
        <span class="days-col mono" :style="{ color: `var(--status-${info.status})` }">
          {{ daysDisplay }}
        </span>
      </div>
      <div class="right-col">
        <StatusPill :status="info.status" />
        <div class="actions">
          <a
            v-if="info.isTencent"
            :href="TENCENT_RENEW_URL"
            target="_blank"
            rel="noopener"
            class="action-btn"
            @click.stop
          >
            续费
          </a>
          <button
            v-if="info.status === 'unknown'"
            class="action-btn"
            :disabled="retrying"
            @click.stop="retry"
          >
            {{ retrying ? '重试中…' : '重试' }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="progress !== null" class="progress-bar">
      <div class="progress-track">
        <div
          class="progress-fill"
          :style="{
            width: progress * 100 + '%',
            background: `var(--status-${info.status})`,
          }"
        />
      </div>
      <span v-if="ownedDays !== null" class="progress-label mono">
        已注册 {{ ownedDays }} 天
      </span>
    </div>
    <div v-if="expanded" class="detail mono">
      <div v-if="info.registrationDate">
        <span class="dim">注册日:</span>
        {{ info.registrationDate.slice(0, 10) }}
      </div>
      <div v-if="info.registrar">
        <span class="dim">注册商:</span> {{ info.registrar }}
      </div>
      <div>
        <span class="dim">DNSSEC:</span> {{ dnssecText }}
      </div>
      <div v-if="info.statuses.length > 0">
        <span class="dim">状态:</span> {{ info.statuses.join(', ') }}
      </div>
      <div v-if="info.nameservers.length > 0">
        <span class="dim">NS:</span> {{ info.nameservers.join(', ') }}
      </div>
      <div v-if="info.error">
        <span class="dim">错误:</span> {{ info.error }}
      </div>
      <div>
        <span class="dim">检查于:</span>
        {{ new Date(info.checkedAt).toLocaleString('zh-CN') }}
      </div>
    </div>
  </li>
</template>

<style scoped>
.row {
  list-style: none;
  padding: 0.85rem 0.5rem;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.2s;
}
.row:hover,
.row:focus {
  background: var(--paper-2);
  outline: none;
}
.main {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 1.25rem;
}
.domain-col {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.domain {
  font-size: 1rem;
  color: var(--ink);
}
.registrar {
  font-size: 0.75rem;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.badge {
  display: inline-block;
  padding: 0.05rem 0.4rem;
  font-size: 0.65rem;
  font-family: var(--font-mono);
  color: var(--status-normal);
  border: 1px solid var(--status-normal);
  border-radius: 2px;
}
.dim {
  color: var(--muted-2);
}
.exp-days {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  white-space: nowrap;
}
.exp-col {
  color: var(--muted);
  font-size: 0.85rem;
  white-space: nowrap;
}
.days-col {
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
}
.right-col {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.actions {
  display: flex;
  gap: 0.4rem;
}
.action-btn {
  font-size: 0.72rem;
  padding: 0.2rem 0.6rem;
  color: var(--muted);
  border: 1px solid var(--line-strong);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  text-decoration: none;
  border-radius: 2px;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.action-btn:hover:not(:disabled) {
  color: var(--ink);
  border-color: var(--muted);
  background: var(--paper-3);
}
.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.progress-bar {
  margin-top: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.progress-track {
  flex: 1;
  height: 2px;
  background: var(--line);
  border-radius: 1px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 1px;
  transition: width 0.6s var(--ease);
}
.progress-label {
  font-size: 0.7rem;
  color: var(--muted-2);
  white-space: nowrap;
}
.detail {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--line);
  font-size: 0.8rem;
  color: var(--muted);
  display: grid;
  gap: 0.3rem;
}
@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr auto;
    gap: 0.5rem 1rem;
  }
  .exp-days {
    grid-column: 1 / 2;
    font-size: 0.75rem;
  }
  .days-col {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
  }
  .right-col {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    justify-self: end;
  }
}
</style>
