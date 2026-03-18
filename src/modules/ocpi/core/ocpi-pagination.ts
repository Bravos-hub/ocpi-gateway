import { Request, Response } from 'express'

const toInt = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

const toIsoDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const firstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : undefined
  }
  return typeof value === 'string' ? value : undefined
}

const buildNextLink = (
  req: Request,
  offset: number,
  limit: number
): string => {
  const params = new URLSearchParams()
  for (const [key, rawValue] of Object.entries(req.query)) {
    const value = firstQueryValue(rawValue)
    if (value !== undefined) params.set(key, value)
  }

  params.set('offset', `${offset}`)
  params.set('limit', `${limit}`)

  const basePath = `${req.baseUrl || ''}${req.path || ''}`
  return `${basePath}?${params.toString()}`
}

export const paginateOcpiList = <T>(
  req: Request,
  res: Response,
  data: T[],
  getLastUpdated: (item: T) => string | undefined,
  defaultLimit = 50,
  maxLimit = 1000
): T[] => {
  const offset = Math.max(0, toInt(firstQueryValue(req.query.offset), 0))
  const rawLimit = Math.max(1, toInt(firstQueryValue(req.query.limit), defaultLimit))
  const limit = Math.min(rawLimit, maxLimit)
  const dateFrom = toIsoDate(firstQueryValue(req.query.date_from))
  const dateTo = toIsoDate(firstQueryValue(req.query.date_to))

  const filtered = data.filter((item) => {
    const value = getLastUpdated(item)
    if (!value) return true

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return true
    if (dateFrom && date < dateFrom) return false
    if (dateTo && date >= dateTo) return false
    return true
  })

  const total = filtered.length
  const sliced = filtered.slice(offset, offset + limit)

  res.setHeader('X-Total-Count', `${total}`)
  res.setHeader('X-Limit', `${limit}`)

  if (offset + limit < total) {
    const nextUrl = buildNextLink(req, offset + limit, limit)
    res.setHeader('Link', `<${nextUrl}>; rel="next"`)
  }

  return sliced
}
