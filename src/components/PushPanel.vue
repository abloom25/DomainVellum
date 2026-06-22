<script setup lang="ts">
import { computed } from 'vue'

type PushStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'unconfigured'

const props = defineProps<{
  configured: boolean
  status: PushStatus
  lastPushTime: number | null
}>()

const emit = defineEmits<{ test: [] }>()

const statusText = computed(() => {
  switch (props.status) {
    case 'sending':
      return '发送中…'
    case 'sent':
      return '已发送'
    case 'failed':
      return '失败'
    case 'unconfigured':
      return '未配置'
    default:
      return '就绪'
  }
})

const lastText = computed(() => {
  if (!props.lastPushTime) return '—'
  return new Date(props.lastPushTime).toLocaleString('zh-CN', { hour12: false })
})
</script>

<template>
  <section v-if="configured" class="section">
    <div class="section-head">
      <span class="section-num mono">03 /</span>
      <h2 class="section-title">推送</h2>
      <span class="section-title-en mono">Push</span>
    </div>
    <div class="push-row">
      <button class="mono" :disabled="status === 'sending'" @click="emit('test')">
        {{ status === 'sending' ? '发送中…' : '测试推送' }}
      </button>
      <div class="push-info mono">
        <span class="dim">状态</span> {{ statusText }}
        <span class="sep">·</span>
        <span class="dim">上次</span> {{ lastText }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.push-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.push-info {
  font-size: 0.85rem;
  color: var(--muted);
}
.dim {
  color: var(--muted-2);
}
.sep {
  color: var(--muted-2);
  margin: 0 0.5rem;
}
</style>
