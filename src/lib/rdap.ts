import type { DomainInfo, DomainStatus } from './types'

const IANA_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
const RDAP_ORG_BASE = 'https://rdap.org/domain/'
const DEFAULT_PROXY = 'https://corsproxy.io/?url='
const FETCH_TIMEOUT = 10_000
const DAY_MS = 24 * 60 * 60 * 1000
const TENCENT_RE = /tencent|腾讯|dnspod/i

const TLD_OVERRIDES: Record<string, string> = {
  cn: 'https://rdap.cnnic.cn/',
}

interface BootstrapData {
  services: [string[], string[]][]
}

interface RdapEvent {
  eventAction: string
  eventDate: string
}

interface RdapEntity {
  roles?: string[]
  vcardArray?: unknown
  entities?: RdapEntity[]
}

interface RdapNameserver {
  ldhName?: string
  unicodeName?: string
}

interface RdapSecureDNS {
  delegationSigned?: boolean
  signers?: string[]
}

interface RdapResponse {
  events?: RdapEvent[]
  entities?: RdapEntity[]
  status?: string[]
  nameservers?: RdapNameserver[]
  secureDNS?: RdapSecureDNS
}

let bootstrapCache: Map<string, string> | null = null

function getProxy(): string {
  return import.meta.env.VITE_CORS_PROXY || DEFAULT_PROXY
}

function normalizeBase(url: string): string {
  return url.endsWith('/') ? url : url + '/'
}

function getTld(domain: string): string {
  const parts = domain.toLowerCase().split('.')
  return parts[parts.length - 1] || ''
}

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function loadBootstrap(): Promise<Map<string, string>> {
  if (bootstrapCache) return bootstrapCache
  const map = new Map<string, string>()
  try {
    const res = await fetchWithTimeout(IANA_BOOTSTRAP_URL)
    if (res.ok) {
      const data = (await res.json()) as BootstrapData
      for (const [tlds, servers] of data.services) {
        const server = servers[0]
        if (server) {
          for (const tld of tlds) {
            map.set(tld.toLowerCase(), normalizeBase(server))
          }
        }
      }
    }
  } catch {
    // ignore — will fall back to rdap.org
  }
  for (const [tld, server] of Object.entries(TLD_OVERRIDES)) {
    if (!map.has(tld)) map.set(tld, normalizeBase(server))
  }
  bootstrapCache = map
  return map
}

async function fetchRdap(domain: string): Promise<RdapResponse> {
  const bootstrap = await loadBootstrap()
  const tld = getTld(domain)
  const server = bootstrap.get(tld)
  const url = server ? `${server}domain/${domain}` : `${RDAP_ORG_BASE}${domain}`

  try {
    const direct = await fetchWithTimeout(url)
    if (direct.ok) return (await direct.json()) as RdapResponse
    throw new Error(`直连 HTTP ${direct.status}`)
  } catch {
    const proxied = await fetchWithTimeout(getProxy() + encodeURIComponent(url))
    if (!proxied.ok) throw new Error(`代理 HTTP ${proxied.status}`)
    return (await proxied.json()) as RdapResponse
  }
}

function findEventDate(events: RdapEvent[] | undefined, action: string): string | null {
  const ev = events?.find((e) => e.eventAction === action)
  return ev?.eventDate ?? null
}

function extractVcardFn(vcardArray: unknown): string | null {
  if (!Array.isArray(vcardArray) || vcardArray.length < 2) return null
  const entries = vcardArray[1]
  if (!Array.isArray(entries)) return null
  for (const entry of entries) {
    if (Array.isArray(entry) && entry[0] === 'fn' && typeof entry[3] === 'string') {
      return entry[3]
    }
  }
  return null
}

function findRegistrar(entities: RdapEntity[] | undefined): string | null {
  if (!entities) return null
  for (const ent of entities) {
    if (ent.roles?.includes('registrar')) {
      const fn = extractVcardFn(ent.vcardArray)
      if (fn) return fn
    }
    const nested = findRegistrar(ent.entities)
    if (nested) return nested
  }
  return null
}

function extractNameservers(ns: RdapNameserver[] | undefined): string[] {
  if (!ns) return []
  const result: string[] = []
  for (const n of ns) {
    const name = n.unicodeName || n.ldhName
    if (name) result.push(name.toLowerCase())
  }
  return result
}

function extractDnssec(sdns: RdapSecureDNS | undefined): boolean | null {
  if (!sdns) return null
  if (sdns.delegationSigned !== undefined) return sdns.delegationSigned
  if (sdns.signers && sdns.signers.length > 0) return true
  return false
}

function computeDays(expiration: string | null): number | null {
  if (!expiration) return null
  const target = new Date(expiration).getTime()
  if (Number.isNaN(target)) return null
  return Math.floor((target - Date.now()) / DAY_MS)
}

function classifyStatus(
  days: number | null,
  critical: number,
  warning: number,
): DomainStatus {
  if (days === null) return 'unknown'
  if (days < 0) return 'expired'
  if (days <= critical) return 'critical'
  if (days <= warning) return 'warning'
  return 'normal'
}

export async function queryDomain(
  domain: string,
  thresholds: { warning: number; critical: number },
): Promise<DomainInfo> {
  const checkedAt = new Date().toISOString()
  try {
    const rdap = await fetchRdap(domain)
    const expirationDate = findEventDate(rdap.events, 'expiration')
    const registrationDate = findEventDate(rdap.events, 'registration')
    const registrar = findRegistrar(rdap.entities)
    const daysRemaining = computeDays(expirationDate)
    const status = classifyStatus(daysRemaining, thresholds.critical, thresholds.warning)
    return {
      domain,
      registrar,
      isTencent: registrar ? TENCENT_RE.test(registrar) : false,
      expirationDate,
      registrationDate,
      daysRemaining,
      status,
      error: null,
      checkedAt,
      dnssec: extractDnssec(rdap.secureDNS),
      statuses: rdap.status ?? [],
      nameservers: extractNameservers(rdap.nameservers),
    }
  } catch (err) {
    return {
      domain,
      registrar: null,
      isTencent: false,
      expirationDate: null,
      registrationDate: null,
      daysRemaining: null,
      status: 'unknown',
      error: err instanceof Error ? err.message : String(err),
      checkedAt,
      dnssec: null,
      statuses: [],
      nameservers: [],
    }
  }
}
