import { ref, onMounted } from 'vue'
import type { DomainConfig, DomainInfo } from '@/lib/types'
import { queryDomain } from '@/lib/rdap'
import { runPool } from '@/lib/pool'
import { getCache, setCache, safeGetItem, safeSetItem } from '@/lib/cache'
import { pushBark } from '@/lib/bark'

const DEFAULT_THRESHOLDS = { warning: 90, critical: 30 }
const DEFAULT_SITE_NAME = 'Domain Vellum'
const DEFAULT_FAVICON = 'http://img.assets.abloom.site/img/2026/06/22/6a39001255781.png'
const PUSH_COOLDOWN = 24 * 60 * 60 * 1000

type PushStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'unconfigured'

async function loadConfig(): Promise<DomainConfig> {
  const res = await fetch('/domains.json')
  if (!res.ok) throw new Error(`配置加载失败: HTTP ${res.status}`)
  const data = (await res.json()) as Partial<DomainConfig>
  return {
    domains: data.domains ?? [],
    thresholds: {
      warning: data.thresholds?.warning ?? DEFAULT_THRESHOLDS.warning,
      critical: data.thresholds?.critical ?? DEFAULT_THRESHOLDS.critical,
    },
    siteName: data.siteName ?? DEFAULT_SITE_NAME,
    favicon: data.favicon ?? DEFAULT_FAVICON,
  }
}

function applySiteMeta(siteName: string, favicon: string): void {
  if (favicon) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (link) link.href = favicon
  }
  if (siteName) {
    document.title = `${siteName} · 域名有效期监控看板`
  }
}

function buildFingerprint(urgent: DomainInfo[]): string {
  return urgent
    .slice()
    .sort((a, b) => a.domain.localeCompare(b.domain))
    .map((d) => `${d.domain}:${d.daysRemaining ?? 'null'}`)
    .join('|')
}

function formatUrgentBody(urgent: DomainInfo[]): string {
  return urgent
    .map((d) => {
      const days = d.daysRemaining ?? 0
      return days < 0 ? `${d.domain} 已过期 ${-days} 天` : `${d.domain} 剩余 ${days} 天`
    })
    .join('\n')
}

function loadLastPushTime(): number | null {
  const auto = safeGetItem('dv:lastPush')
  const manual = safeGetItem('dv:lastManualPush')
  const autoTs = auto ? (JSON.parse(auto) as { ts: number }).ts : 0
  const manualTs = manual ? Number(manual) : 0
  const latest = Math.max(autoTs, manualTs)
  return latest > 0 ? latest : null
}

export function useDomainCheck() {
  const domains = ref<DomainInfo[]>([])
  const loading = ref(true)
  const refreshing = ref(false)
  const retryingDomains = ref(new Set<string>())
  const error = ref<string | null>(null)
  const lastCheck = ref<string | null>(null)
  const siteName = ref(DEFAULT_SITE_NAME)
  const favicon = ref(DEFAULT_FAVICON)
  const pushConfigured = !!import.meta.env.VITE_BARK_TOKEN
  const pushStatus = ref<PushStatus>('idle')
  const lastPushTime = ref<number | null>(null)
  let configCache: DomainConfig | null = null

  async function ensureConfig(): Promise<DomainConfig> {
    if (configCache) return configCache
    configCache = await loadConfig()
    siteName.value = configCache.siteName ?? DEFAULT_SITE_NAME
    favicon.value = configCache.favicon ?? DEFAULT_FAVICON
    applySiteMeta(siteName.value, favicon.value)
    return configCache
  }

  async function evaluatePush(results: DomainInfo[]): Promise<void> {
    const urgent = results.filter((d) => d.status === 'expired' || d.status === 'critical')
    if (urgent.length === 0) return

    const fingerprint = buildFingerprint(urgent)
    const lastRaw = safeGetItem('dv:lastPush')
    if (lastRaw) {
      const last = JSON.parse(lastRaw) as { fingerprint: string; ts: number }
      if (last.fingerprint === fingerprint && Date.now() - last.ts < PUSH_COOLDOWN) {
        return
      }
    }

    const ok = await pushBark('域名到期提醒', formatUrgentBody(urgent), {
      group: 'domain-vellum',
    })
    if (ok) {
      safeSetItem('dv:lastPush', JSON.stringify({ fingerprint, ts: Date.now() }))
      lastPushTime.value = Date.now()
    }
  }

  async function runAll(skipCache: boolean): Promise<void> {
    error.value = null
    try {
      const config = await ensureConfig()
      if (config.domains.length === 0) {
        domains.value = []
        return
      }
      const results = await runPool(
        config.domains,
        async (domain) => {
          if (!skipCache) {
            const cached = getCache(domain)
            if (cached) return cached
          }
          const info = await queryDomain(domain, config.thresholds)
          setCache(domain, info)
          return info
        },
        5,
      )
      domains.value = results
      lastCheck.value = new Date().toISOString()
      await evaluatePush(results)
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    }
  }

  async function run(): Promise<void> {
    loading.value = true
    await runAll(false)
    loading.value = false
  }

  async function refresh(): Promise<void> {
    refreshing.value = true
    await runAll(true)
    refreshing.value = false
  }

  async function retryDomain(domain: string): Promise<void> {
    const next = new Set(retryingDomains.value)
    next.add(domain)
    retryingDomains.value = next
    try {
      const config = await ensureConfig()
      const info = await queryDomain(domain, config.thresholds)
      setCache(domain, info)
      domains.value = domains.value.map((d) => (d.domain === domain ? info : d))
      lastCheck.value = new Date().toISOString()
      await evaluatePush(domains.value)
    } catch {
      // keep original entry on failure
    } finally {
      const after = new Set(retryingDomains.value)
      after.delete(domain)
      retryingDomains.value = after
    }
  }

  async function testPush(): Promise<void> {
    if (!pushConfigured) {
      pushStatus.value = 'unconfigured'
      return
    }
    pushStatus.value = 'sending'
    const ok = await pushBark('Domain Vellum 测试', '推送通道正常', {
      group: 'domain-vellum',
    })
    if (ok) {
      pushStatus.value = 'sent'
      lastPushTime.value = Date.now()
      safeSetItem('dv:lastManualPush', String(Date.now()))
    } else {
      pushStatus.value = 'failed'
    }
  }

  onMounted(() => {
    lastPushTime.value = loadLastPushTime()
    void run()
  })

  return {
    domains,
    loading,
    refreshing,
    retryingDomains,
    error,
    lastCheck,
    siteName,
    favicon,
    pushConfigured,
    pushStatus,
    lastPushTime,
    testPush,
    refresh,
    retryDomain,
  }
}
