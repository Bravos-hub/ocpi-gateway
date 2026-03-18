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
  private readonly tokenPath: string
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly scopes: string
  private readonly timeoutMs: number

  private accessToken: string | null = null
  private accessTokenExpiresAt = 0

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>('backend.baseUrl') || '').replace(/\/$/, '')
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

  async get<T>(path: string, params?: Record<string, unknown>) {
    return this.request<T>({ method: 'GET', url: path, params })
  }

  async post<T>(path: string, data?: unknown) {
    return this.request<T>({ method: 'POST', url: path, data })
  }

  async put<T>(path: string, data?: unknown) {
    return this.request<T>({ method: 'PUT', url: path, data })
  }

  async patch<T>(path: string, data?: unknown) {
    return this.request<T>({ method: 'PATCH', url: path, data })
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
    const response = await this.client.post<ServiceTokenResponse>(
      this.tokenPath,
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
}
