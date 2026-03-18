import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ name: 'ocpi_partners', schema: 'cpms' })
export class OcpiPartnerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column()
  name!: string

  @Column({ length: 3 })
  partyId!: string

  @Column({ length: 2 })
  countryCode!: string

  @Column()
  role!: string

  @Column({ default: 'PENDING' })
  status!: string

  @Column({ default: '2.2.1' })
  version!: string

  @Column({ nullable: true })
  versionsUrl!: string | null

  @Column({ nullable: true })
  tokenA!: string | null

  @Column({ nullable: true })
  tokenB!: string | null

  @Column({ nullable: true })
  tokenC!: string | null

  @Column({ type: 'jsonb', nullable: true })
  roles!: Record<string, unknown>[] | null

  @Column({ type: 'jsonb', nullable: true })
  endpoints!: Record<string, unknown> | null

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncAt!: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}
