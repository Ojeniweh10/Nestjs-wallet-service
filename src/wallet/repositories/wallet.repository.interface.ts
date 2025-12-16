import { Wallet } from '../entities/wallet.entity';

/**
 * Wallet Repository Interface - Contract for data access.
 */
export interface IWalletRepository {
  create(wallet: Wallet): Promise<Wallet>;
  findById(id: string): Promise<Wallet | null>;
  findByIds(ids: string[]): Promise<Map<string, Wallet>>;
  update(wallet: Wallet, expectedVersion: number): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<Wallet[]>;
  exists(id: string): Promise<boolean>;
}
