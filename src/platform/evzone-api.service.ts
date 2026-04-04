import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'

type ServiceTokenResponse = {
  accessToken: string
  tokenType?: string
  expiresIn?: string | number
  scope?: string
}

@Injectable()
export class EvzoneApiService {
  private readonly logger = new Logger(EvzoneApiService.name)
  private readonly client: AxiosInstance
  private readonly baseUrl: string
  private readonly apiPrefix: string
  private readonly baseHasApiPrefix: boolean
  private readonly tokenPath: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly scopes: string
  private readonly timeoutMs: number

  private accessToken: string | null = null
  private accessTokenExpiresAt = 0

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>('backend.baseUrl') || '').replace(/\/$/, '')
    this.apiPrefix = this.normalizeApiPrefix(this.config.get<string>('backend.apiPrefix') || '/api/v1')
    this.baseHasApiPrefix = this.detectBasePrefix(this.baseUrl, this.apiPrefix)
    this.tokenPath = this.config.get<string>('backend.tokenPath') || '/auth/service/token'
    this.clientId = this.config.get<string>('backend.clientId') || ''
    this.clientSecret = this.config.get<string>('backend.clientSecret') || ''
    this.scopes = this.config.get<string>('backend.scopes') || ''
    this.timeoutMs = this.config.get<number>('backend.timeoutMs') || 5000

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeoutMs,
    })
  }

  isEnabled(): boolean {
    return Boolean(this.baseUrl && this.clientId && this.clientSecret)
  }

  async checkConnection(): Promise<{ status: 'up' | 'down' | 'unconfigured'; error?: string }> {
    if (!this.isEnabled()) {
      return { status: 'unconfigured' }
    }

    try {
      await this.getAccessToken()
      return { status: 'up' }
    } catch (error) {
      return { status: 'down', error: (error as Error).message }
    }
  }

  async get<T>(path: string, params?: Record<string, unknown>) {
    return this.request<T>({ method: 'GET', url: this.withApiPrefix(path), params })
  }

  async post<T>(path: string, data?: unknown) {
    return this.request<T>({ method: 'POST', url: this.withApiPrefix(path), data })
  }

  async put<T>(path: string, data?: unknown) {
    return this.request<T>({ method: 'PUT', url: this.withApiPrefix(path), data })
  }

  async patch<T>(path: string, data?: unknown) {
    return this.request<T>({ method: 'PATCH', url: this.withApiPrefix(path), data })
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    if (!this.isEnabled()) {
      throw new Error('Backend API integration is not configured')
    }

    const token = await this.getAccessToken()
    const headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
      'X-Request-ID': randomUUID(),
      'X-Correlation-ID': randomUUID(),
    }

    const response = await this.client.request<T>({
      ...config,
      headers,
    })
    return response.data
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now()
    if (this.accessToken && now < this.accessTokenExpiresAt) {
      return this.accessToken
    }

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const tokenPath = this.withApiPrefix(this.tokenPath)
    const response = await this.client.post<ServiceTokenResponse>(
      tokenPath,
      {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        scope: this.scopes,
      },
      {
        headers: {
          Authorization: `Basic ${basic}`,
        },
      }
    )

    const token = response.data?.accessToken
    if (!token) {
      throw new Error('Failed to obtain service token from backend')
    }

    const expiresMs = this.parseExpiresIn(response.data?.expiresIn)
    const skewMs = 30_000
    this.accessToken = token
    this.accessTokenExpiresAt = Date.now() + Math.max(0, expiresMs - skewMs)
    return token
  }

  private parseExpiresIn(expiresIn?: string | number): number {
    if (typeof expiresIn === 'number') {
      return expiresIn * 1000
    }
    if (typeof expiresIn !== 'string') {
      return 5 * 60 * 1000
    }

    const trimmed = expiresIn.trim()
    const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(trimmed)
    if (!match) {
      this.logger.warn(`Unrecognized expiresIn value: ${expiresIn}, defaulting to 5m`)
      return 5 * 60 * 1000
    }

    const value = parseInt(match[1], 10)
    const unit = (match[2] || 's').toLowerCase()

    switch (unit) {
      case 'ms':
        return value
      case 's':
        return value * 1000
      case 'm':
        return value * 60 * 1000
      case 'h':
        return value * 60 * 60 * 1000
      case 'd':
        return value * 24 * 60 * 60 * 1000
      default:
        return 5 * 60 * 1000
    }
  }

  private withApiPrefix(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    if (!this.apiPrefix || this.baseHasApiPrefix) {
      return normalizedPath
    }

    if (
      normalizedPath === this.apiPrefix ||
      normalizedPath.startsWith(`${this.apiPrefix}/`)
    ) {
      return normalizedPath
    }

    return `${this.apiPrefix}${normalizedPath}`
  }

  private normalizeApiPrefix(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed === '/') return ''
    const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed
  }

  private detectBasePrefix(baseUrl: string, apiPrefix: string): boolean {
    if (!baseUrl || !apiPrefix) return false
    try {
      const parsed = new URL(baseUrl)
      const pathname = parsed.pathname.replace(/\/$/, '')
      return pathname === apiPrefix || pathname.endsWith(apiPrefix)
    } catch {
      return false
    }
  }
}
