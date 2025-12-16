import { IsString, IsNumber, IsPositive, IsOptional, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferFundsDto {
  @ApiProperty({
    description: 'ID of the target wallet',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty({ message: 'Target wallet ID is required' })
  targetWalletId!: string;

  @ApiProperty({
    description: 'Amount to transfer',
    example: 50.0,
    minimum: 0.01,
    maximum: 1000000,
  })
  @IsNumber()
  @IsPositive({ message: 'Amount must be positive' })
  @Max(1000000, { message: 'Amount cannot exceed $1,000,000' })
  amount!: number;

  @ApiProperty({
    description: 'Idempotency key for duplicate prevention',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  @IsNotEmpty({ message: 'Idempotency key is required' })
  idempotencyKey!: string;

  @ApiProperty({
    description: 'Optional metadata',
    required: false,
    example: { reason: 'Payment for services' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
