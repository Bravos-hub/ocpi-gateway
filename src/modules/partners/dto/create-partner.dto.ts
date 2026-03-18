import { IsIn, IsOptional, IsString } from 'class-validator'

export class CreatePartnerDto {
  @IsString()
  name!: string

  @IsString()
  partyId!: string

  @IsString()
  countryCode!: string

  @IsString()
  @IsIn(['CPO', 'EMSP', 'HUB', 'OTHER'])
  role!: string

  @IsOptional()
  @IsString()
  versionsUrl?: string

  @IsOptional()
  @IsString()
  tokenA?: string
}
