export type DomainStatus =
  | 'expired'
  | 'critical'
  | 'warning'
  | 'normal'
  | 'unknown'

export interface DomainInfo {
  domain: string
  registrar: string | null
  isTencent: boolean
  expirationDate: string | null
  registrationDate: string | null
  daysRemaining: number | null
  status: DomainStatus
  error: string | null
  checkedAt: string
  dnssec: boolean | null
  statuses: string[]
  nameservers: string[]
}

export interface DomainConfig {
  domains: string[]
  thresholds: {
    warning: number
    critical: number
  }
  siteName?: string
  favicon?: string
}

export interface PushRecord {
  fingerprint: string
  ts: number
}
