import { IsString, IsNumber, IsPositive, IsOptional, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({
    description: 'Amount to add to wallet',
    example: 100.5,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber()
  @IsPositive({ message: 'Amount must be positive' })
  @Max(1000000, { message: 'Amount cannot exceed $1,000,000' })
  amount!: number;

  @ApiProperty({
    description: 'Idempotency key for duplicate prevention (UUID recommended)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty({ message: 'Idempotency key is required' })
  idempotencyKey!: string;

  @ApiProperty({
    description: 'Optional metadata (notes, reference, etc.)',
    required: false,
    example: { source: 'bank_transfer', reference: 'REF123' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
