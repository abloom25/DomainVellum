import type { DomainInfo } from './types'

const CACHE_TTL = 24 * 60 * 60 * 1000

interface CacheEntry {
  info: DomainInfo
  ts: number
}

function cacheKey(domain: string): string {
  return `dv:cache:${domain}`
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function safeGetItem(key: string): string | null {
  const storage = safeStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.setItem(key, value)
  } catch {
    // ignore quota / privacy mode
  }
}

export function getCache(domain: string): DomainInfo | null {
  const raw = safeGetItem(cacheKey(domain))
  if (!raw) return null
  try {
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL) return null
    if (entry.info.status === 'unknown') return null
    return entry.info
  } catch {
    return null
  }
}

export function setCache(domain: string, info: DomainInfo): void {
  if (info.status === 'unknown') return
  const entry: CacheEntry = { info, ts: Date.now() }
  safeSetItem(cacheKey(domain), JSON.stringify(entry))
}
