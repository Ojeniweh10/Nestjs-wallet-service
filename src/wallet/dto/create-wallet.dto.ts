import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Currency } from '../entities/wallet.entity';

export class CreateWalletDto {
  @ApiProperty({
    description: 'Wallet currency',
    enum: Currency,
    default: Currency.USD,
    example: Currency.USD,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiProperty({
    description: 'Initial balance (optional, defaults to 0)',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Initial balance cannot be negative' })
  initialBalance?: number;
}
