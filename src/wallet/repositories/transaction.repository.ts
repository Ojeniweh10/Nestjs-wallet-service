import { Injectable, Logger } from '@nestjs/common';
import { Transaction } from '../entities/transaction.entity';

/**
 * Transaction Repository - Manages transaction persistence.
 *
 * WHY: Separate from Wallet Repository because:
 * 1. Transactions have different access patterns (append-only)
 * 2. Different querying needs (filter by wallet, date range, type)
 * 3. May need different storage optimization (e.g., time-series DB)
 * 4. Single Responsibility Principle
 *
 * DESIGN: Append-only log
 * - Transactions never updated (immutable)
 * - Only INSERT operations
 * - DELETE only for testing/admin
 */
@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);
  /**
   * Storage: Array acts as append-only log.
   *
   * WHY Array instead of Map:
   * - Transactions are primarily accessed by list operations
   * - Natural ordering (insertion order = chronological)
   * - Efficient iteration for filtering
   *
   */
  private readonly transactions: Transaction[] = [];

  /**
   * Index for fast ID lookups.
   *
   * WHY: findById is O(1) with Map, O(n) with array.
   * Trade-off: Extra memory for speed.
   */
  private readonly transactionIndex: Map<string, Transaction> = new Map();

  async create(transaction: Transaction): Promise<Transaction> {
    /**
     * Appends transaction to log.
     *
     * IMMUTABILITY: Once created, transaction never changes.
     * This is fundamental to financial systems (audit trail).
     */
    const cloned = this.cloneTransaction(transaction);
    // Add to both array (for iteration) and index (for lookups)
    this.transactions.push(cloned);
    this.transactionIndex.set(transaction.id, cloned);
    this.logger.log(
      `Created transaction: ${transaction.reference}, ` +
        `type: ${transaction.type}, amount: ${transaction.amount}`,
    );
    return this.cloneTransaction(cloned);
  }

  async findById(id: string): Promise<Transaction | null> {
    const transaction = this.transactionIndex.get(id);
    return transaction ? this.cloneTransaction(transaction) : null;
  }

  async findByReference(reference: string): Promise<Transaction | null> {
    /**
     * Finds transaction by human-readable reference.
     *
     * WHY: Customer support uses reference (TXN-20250101-001-A7F3)
     * instead of UUID for looking up transactions.
     *
     */
    const transaction = this.transactions.find((t) => t.reference === reference);
    return transaction ? this.cloneTransaction(transaction) : null;
  }

  async findByWalletId(
    walletId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<Transaction[]> {
    /**
     * Retrieves all transactions involving a wallet.
     *
     * USE CASE: Display transaction history to user.
     *
     * INCLUDES:
     * - Transactions where wallet is source (debits)
     * - Transactions where wallet is target (credits)
     *
     * PAGINATION:
     * - limit: Max results to return
     * - offset: Skip first N results
     * - sortOrder: Chronological (asc) or reverse (desc)
     *
     */
    const { limit, offset = 0, sortOrder = 'desc' } = options || {};
    let filtered = this.transactions.filter((t) => t.involvesWallet(walletId));

    // Sort by creation time
    if (sortOrder === 'desc') {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    filtered = filtered.slice(offset);
    if (limit !== undefined) {
      filtered = filtered.slice(0, limit);
    }

    this.logger.debug(`Retrieved ${filtered.length} transactions for wallet ${walletId}`);

    return filtered.map((t) => this.cloneTransaction(t));
  }

  async findByType(
    type: string,
    options?: { limit?: number; offset?: number },
  ): Promise<Transaction[]> {
    /**
     * Finds transactions by type.
     *
     * USE CASE: Analytics, reporting (e.g., "show all transfers today").
     *
     */
    const { limit, offset = 0 } = options || {};
    let filtered = this.transactions.filter((t) => t.type === type);

    if (limit) {
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered.map((t) => this.cloneTransaction(t));
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Transaction[]> {
    /**
     * Returns all transactions with pagination.
     *
     * USE CASE: Admin dashboard, analytics.
     *
     * IN PRODUCTION: Always use pagination (never load all transactions).
     * Else With millions of transactions, this would crash.
     */
    const { limit, offset = 0, sortOrder = 'desc' } = options || {};
    let result = [...this.transactions];

    // Sort
    if (sortOrder === 'desc') {
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Paginate
    if (limit) {
      result = result.slice(offset, offset + limit);
    }

    return result.map((t) => this.cloneTransaction(t));
  }

  async countByWalletId(walletId: string): Promise<number> {
    /**
     * Counts transactions for a wallet.
     *
     * WHY: Display "Showing 20 of 543 transactions" without loading all.
     *
     */
    return this.transactions.filter((t) => t.involvesWallet(walletId)).length;
  }

  async delete(id: string): Promise<boolean> {
    /**
     * Deletes a transaction.
     *
     * CAUTION: In production, NEVER delete transactions.
     * Instead: Mark as REVERSED or add compensating transaction.
     *
     * This method exists only for:
     * - Testing (clean up test data)
     * - Admin operations (fix data errors)
     */
    const index = this.transactions.findIndex((t) => t.id === id);
    if (index === -1) {
      return false;
    }

    this.transactions.splice(index, 1);
    this.transactionIndex.delete(id);
    this.logger.warn(`Deleted transaction: ${id} (use only for testing!)`);
    return true;
  }

  /**
   * Clones transaction to prevent mutations.
   */
  private cloneTransaction(transaction: Transaction): Transaction {
    // Transaction constructor handles cloning
    return new Transaction({
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.type,
      sourceWalletId: transaction.sourceWalletId,
      targetWalletId: transaction.targetWalletId,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      metadata: transaction.metadata ? { ...transaction.metadata } : undefined,
    });
  }

  /**
   * TESTING HELPERS
   */
  async clear(): Promise<void> {
    this.transactions.length = 0;
    this.transactionIndex.clear();
    this.logger.debug('Cleared all transactions (test utility)');
  }

  async count(): Promise<number> {
    return this.transactions.length;
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. Append-Only Log:
 *    - Transactions never updated
 *    - Immutable by design
 *    - Audit trail integrity
 *
 * 2. Dual Storage:
 *    - Array: Efficient iteration, natural ordering
 *    - Map: Fast ID lookups O(1)
 *    - Trade-off: 2x memory for better performance
 *
 * 3. Query Patterns:
 *    - By wallet: Most common (user viewing history)
 *    - By type: Analytics queries
 *    - By reference: Customer support
 *    - All queries support pagination
 *
 * 4. Pagination:
 *    - Always use limit/offset in production
 *    - Default sort: newest first (desc)
 *    - Frontend can request older transactions
 *
 *
 */
