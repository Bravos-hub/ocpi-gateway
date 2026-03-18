import { IsIn, IsOptional, IsString } from 'class-validator'

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  @IsIn(['PENDING', 'ACTIVE', 'SUSPENDED'])
  status?: string

  @IsOptional()
  @IsString()
  versionsUrl?: string

  @IsOptional()
  @IsString()
  tokenA?: string

  @IsOptional()
  @IsString()
  tokenB?: string

  @IsOptional()
  @IsString()
  tokenC?: string

  @IsOptional()
  @IsString()
  version?: string

  @IsOptional()
  endpoints?: Record<string, unknown>[] | null

  @IsOptional()
  roles?: Record<string, unknown>[] | null

  @IsOptional()
  @IsString()
  lastSyncAt?: string
}
