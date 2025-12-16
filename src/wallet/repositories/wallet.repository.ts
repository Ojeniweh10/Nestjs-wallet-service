import { Injectable, Logger } from '@nestjs/common';
import { Wallet } from '../entities/wallet.entity';
import { IWalletRepository } from './wallet.repository.interface';
import { WalletAlreadyExistsError } from 'src/common/errors/domain.errors';

/**
 * In-memory implementation of Wallet Repository.
 */
@Injectable()
export class WalletRepository implements IWalletRepository {
  private readonly logger = new Logger(WalletRepository.name);
  /**
   * In-memory storage using Map.
   *
   * WHY Map instead of plain object:
   * - Better performance for frequent additions/deletions
   * - Key can be any type (not just strings)
   * - Built-in size property
   * - Iteration maintains insertion order
   */
  private readonly wallets: Map<string, Wallet> = new Map();

  async create(wallet: Wallet): Promise<Wallet> {
    // Check for duplicate - prevent overwriting existing wallet
    if (this.wallets.has(wallet.id)) {
      this.logger.warn(`Attempt to create duplicate wallet: ${wallet.id}`);
      throw new WalletAlreadyExistsError(wallet.id);
    }

    // Store wallet (Map stores by reference, so we clone to avoid mutations)
    this.wallets.set(wallet.id, this.cloneWallet(wallet));

    this.logger.log(`Created wallet: ${wallet.id}, balance: ${wallet.balance}`);
    // Return a clone to prevent external mutations
    return this.cloneWallet(wallet);
  }

  async findById(id: string): Promise<Wallet | null> {
    const wallet = this.wallets.get(id);
    if (!wallet) {
      this.logger.debug(`Wallet not found: ${id}`);
      return null;
    }

    // Return clone to prevent external mutations
    return this.cloneWallet(wallet);
  }

  async findByIds(ids: string[]): Promise<Map<string, Wallet>> {
    /**
     * Batch fetch optimization.
     *
     * WHY: Transfer operation needs both sender and receiver.
     * One call to findByIds([sender, receiver]) instead of two findById calls.
     *
     * PERFORMANCE:
     * - In-memory: O(n) where n = number of IDs
     * - PostgreSQL: SELECT * FROM wallets WHERE id IN (?, ?)
     * - Much better than n separate queries
     */
    const result = new Map<string, Wallet>();

    for (const id of ids) {
      const wallet = this.wallets.get(id);
      if (wallet) {
        result.set(id, this.cloneWallet(wallet));
      }
    }

    this.logger.debug(`Batch fetched ${result.size}/${ids.length} wallets`);
    return result;
  }

  async update(wallet: Wallet, expectedVersion: number): Promise<boolean> {
    /**
     * Optimistic locking implementation.
     *
     * ALGORITHM:
     * 1. Get current wallet from storage
     * 2. Check if version matches expectedVersion
     * 3. If match: update and return true
     * 4. If mismatch: someone else updated it, return false
     *
     * WHY THIS MATTERS:
     * Scenario without optimistic locking:
     * - User A reads wallet (balance: $100, version: 1)
     * - User B reads wallet (balance: $100, version: 1)
     * - User A deducts $50 (balance: $50, version: 2)
     * - User B deducts $30 (balance: $70, version: 2) ← Wrong! Should be $20
     *
     * With optimistic locking:
     * - User A reads wallet (balance: $100, version: 1)
     * - User B reads wallet (balance: $100, version: 1)
     * - User A updates with expectedVersion=1 ✓ (balance: $50, version: 2)
     * - User B updates with expectedVersion=1 ✗ (version is now 2, not 1)
     * - User B retries: reads wallet (balance: $50, version: 2)
     * - User B updates with expectedVersion=2 ✓ (balance: $20, version: 3)
     */
    const existingWallet = this.wallets.get(wallet.id);

    if (!existingWallet) {
      this.logger.warn(`Cannot update non-existent wallet: ${wallet.id}`);
      return false;
    }

    // Version mismatch - concurrent modification detected
    if (existingWallet.version !== expectedVersion) {
      this.logger.warn(
        `Version mismatch for wallet ${wallet.id}. ` +
          `Expected: ${expectedVersion}, Current: ${existingWallet.version}`,
      );
      return false;
    }

    // Update successful - increment version
    wallet.version = expectedVersion + 1;
    wallet.updatedAt = new Date();

    this.wallets.set(wallet.id, this.cloneWallet(wallet));
    this.logger.log(
      `Updated wallet: ${wallet.id}, balance: ${wallet.balance}, version: ${wallet.version}`,
    );
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.wallets.delete(id);
    if (deleted) {
      this.logger.log(`Deleted wallet: ${id}`);
    } else {
      this.logger.warn(`Cannot delete non-existent wallet: ${id}`);
    }
    return deleted;
  }

  async findAll(): Promise<Wallet[]> {
    /**
     * Returns all wallets.
     *
     */
    const wallets = Array.from(this.wallets.values()).map((w) => this.cloneWallet(w));

    this.logger.debug(`Retrieved ${wallets.length} wallets`);
    return wallets;
  }

  async exists(id: string): Promise<boolean> {
    /**
     * Efficient existence check.
     *
     * WHY: Sometimes we just need to know if wallet exists.
     * Map.has() is O(1), no need to fetch entire wallet.
     *
     * In PostgreSQL: SELECT COUNT(1) FROM wallets WHERE id = ?
     * Much faster than SELECT * FROM wallets WHERE id = ?
     */
    return this.wallets.has(id);
  }

  /**
   * Clones a wallet to prevent external mutations.
   *
   * WHY: Defensive programming.
   * - Callers can't accidentally modify stored wallets
   * - Entity integrity maintained
   * - Predictable behavior
   *
   * ALTERNATIVE: Use Object.freeze() on stored wallets
   * PERFORMANCE: Cloning is cheap for small objects like Wallet
   */
  private cloneWallet(wallet: Wallet): Wallet {
    const cloned = new Wallet(wallet.id, wallet.currency, wallet.balance);
    cloned.version = wallet.version;
    cloned.updatedAt = wallet.updatedAt;
    // createdAt is set in constructor
    return cloned;
  }

  /**
   * TESTING HELPER: Clears all wallets (used in tests only).
   *
   * WHY: Each test should start with clean state.
   * In production with real DB, this would be a migration rollback.
   */
  async clear(): Promise<void> {
    this.wallets.clear();
    this.logger.debug('Cleared all wallets (test utility)');
  }

  /**
   * TESTING HELPER: Gets current size (useful for assertions).
   */
  async count(): Promise<number> {
    return this.wallets.size;
  }
}

/**
 * DESIGN NOTES:
 
 * 1. Immutability:
 *    - Always return clones, never originals
 *    - Prevents accidental mutations
 *    - Caller changes don't affect storage
 *
 * 2. Logging Strategy:
 *    - DEBUG: Frequent operations (findById)
 *    - LOG: State changes (create, update)
 *    - WARN: Unexpected situations (version mismatch, not found)
 *    - ERROR: Actual errors (not used here, but would be for DB errors)
 * 
 * 3. Error Handling:
 *    - Throws domain errors (WalletAlreadyExistsError)
 *    - Returns null for not found (not an error condition)
 *    - Returns false for version mismatch (caller decides retry strategy)
 * 
 * 4. Performance:
 *    - Map operations are O(1)
 *    - Cloning is O(n) where n = number of fields (small constant)
 *    - Batch operations optimize multiple fetches
 * 
 */
