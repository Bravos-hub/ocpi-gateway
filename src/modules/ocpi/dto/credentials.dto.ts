import { IsArray, IsOptional, IsString } from 'class-validator'

export class CredentialsDto {
  @IsString()
  token!: string

  @IsString()
  url!: string

  @IsOptional()
  @IsString()
  party_id?: string

  @IsOptional()
  @IsString()
  country_code?: string

  @IsOptional()
  business_details?: Record<string, unknown>

  @IsArray()
  roles!: Record<string, unknown>[]
}
