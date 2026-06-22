<script setup lang="ts">
import { useDomainCheck } from '@/composables/useDomainCheck'
import StarField from '@/components/StarField.vue'
import AppHeader from '@/components/AppHeader.vue'
import DomainList from '@/components/DomainList.vue'
import SummaryPanel from '@/components/SummaryPanel.vue'
import PushPanel from '@/components/PushPanel.vue'
import AppFooter from '@/components/AppFooter.vue'

const {
  domains,
  loading,
  refreshing,
  retryingDomains,
  error,
  siteName,
  pushConfigured,
  pushStatus,
  lastPushTime,
  testPush,
  refresh,
  retryDomain,
} = useDomainCheck()
</script>

<template>
  <StarField />
  <div class="app">
    <AppHeader :refreshing="refreshing" :site-name="siteName" @refresh="refresh" />
    <div v-if="error" class="error-state mono">{{ error }}</div>
    <template v-else>
      <DomainList
        :domains="domains"
        :loading="loading"
        :retrying-domains="retryingDomains"
        @retry="retryDomain"
      />
      <SummaryPanel :domains="domains" />
      <PushPanel
        :configured="pushConfigured"
        :status="pushStatus"
        :last-push-time="lastPushTime"
        @test="testPush"
      />
    </template>
    <AppFooter />
  </div>
</template>
