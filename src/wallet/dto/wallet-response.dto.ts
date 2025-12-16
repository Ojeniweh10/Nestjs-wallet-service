import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../entities/wallet.entity';

export class WalletResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'USD', enum: Currency })
  currency!: string;

  @ApiProperty({ example: 1250.5 })
  balance!: number;

  @ApiProperty({ example: 1 })
  version!: number;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T13:30:00.000Z' })
  updatedAt!: string;
}

export class TransactionResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'TXN-20250101123045-001-A7F3' })
  reference!: string;

  @ApiProperty({ example: 'TRANSFER' })
  type!: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  sourceWalletId!: string | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  targetWalletId!: string;

  @ApiProperty({ example: 100.0 })
  amount!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiProperty({ example: 'COMPLETED' })
  status!: string;

  @ApiProperty({
    example: { reason: 'Payment' },
    required: false,
  })
  metadata?: Record<string, any>;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  updatedAt!: string;
}

export class WalletDetailsResponseDto {
  @ApiProperty({ type: WalletResponseDto })
  wallet!: WalletResponseDto;

  @ApiProperty({
    type: [TransactionResponseDto],
    description: 'Transaction history for this wallet',
  })
  transactions!: TransactionResponseDto[];

  @ApiProperty({
    example: 15,
    description: 'Total number of transactions',
  })
  totalTransactions!: number;
}

export class TransferResponseDto {
  @ApiProperty({
    type: WalletResponseDto,
    description: 'Source wallet after transfer',
  })
  sourceWallet!: WalletResponseDto;

  @ApiProperty({
    type: WalletResponseDto,
    description: 'Target wallet after transfer',
  })
  targetWallet!: WalletResponseDto;

  @ApiProperty({
    type: TransactionResponseDto,
    description: 'Transaction record',
  })
  transaction!: TransactionResponseDto;
}

export class ApiResponse<T> {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  data!: T;

  @ApiProperty({
    example: '2025-01-01T12:00:00.000Z',
    required: false,
  })
  timestamp?: string;
}
