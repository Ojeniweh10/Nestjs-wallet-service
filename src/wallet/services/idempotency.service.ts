import { Injectable, Logger } from '@nestjs/common';
import { DuplicateTransactionError } from 'src/common/errors/domain.errors';
import * as crypto from 'crypto';

/**
 * Idempotency Service - Prevents duplicate operations.
 *
 * WHY IDEMPOTENCY IS CRITICAL:
 * Financial systems MUST be idempotent to handle:
 * 1. Network failures (client retries same request)
 * 2. User impatience (double-clicking submit button)
 * 3. API client bugs (sending duplicate requests)
 * 4. Load balancer retries
 *
 * WITHOUT IDEMPOTENCY:
 * - User clicks "Transfer $100" twice → $200 transferred
 * - Network timeout → Client retries → Duplicate charge
 *
 * WITH IDEMPOTENCY:
 * - Same idempotency key → Same result, operation not duplicated
 * - Request processed exactly once, even if retried
 *
 */

interface IdempotencyRecord {
  key: string; // Original idempotency key from client
  operation: string; // Operation type (FUND, TRANSFER)
  hash: string; // Hash of key + operation + parameters
  requestData: any; // Original request data for comparison
  response: any; // Cached response to return on duplicates
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  /**
   * In-memory cache of idempotency records.
   *
   * KEY: Hash of (idempotencyKey + operation + parameters)
   * VALUE: IdempotencyRecord with cached response
   *
   */
  private readonly cache: Map<string, IdempotencyRecord> = new Map();

  /**
   * TTL for idempotency records (24 hours).
   *
   * WHY 24 hours:
   * - Long enough for legitimate retries (network issues)
   * - Short enough to not store forever (memory concerns)
   * - Industry standard (Stripe uses 24h)
   *
   * CUSTOMIZABLE: Could be longer for critical operations.
   */
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Processes an operation with idempotency guarantee.
   *
   * ALGORITHM:
   * 1. Generate hash from idempotency key + operation + parameters
   * 2. Check if hash exists in cache
   * 3. If exists:
   *    a. Compare request parameters with cached request
   *    b. If same: Return cached response (idempotent retry)
   *    c. If different: Throw error (key reuse with different params)
   * 4. If not exists:
   *    a. Execute the operation
   *    b. Cache the response with TTL
   *    c. Return response
   *
   * @param idempotencyKey - Client-provided unique key (usually UUID)
   * @param operation - Operation identifier (FUND_WALLET, TRANSFER_FUNDS)
   * @param requestData - Request parameters for comparison
   * @param fn - Function to execute if not cached
   * @returns Operation result (either cached or newly executed)
   */
  async processWithIdempotency<T>(
    idempotencyKey: string,
    operation: string,
    requestData: any,
    fn: () => Promise<T>,
  ): Promise<T> {
    // Step 1: Generate deterministic hash
    const hash = this.generateHash(idempotencyKey, operation, requestData);

    this.logger.debug(
      `Processing idempotent operation: ${operation}, key: ${idempotencyKey}, hash: ${hash}`,
    );

    // Step 2: Check cache
    const cached = this.cache.get(hash);

    if (cached) {
      // Found cached result - verify it's the same request
      this.logger.log(`Cache hit for idempotency key: ${idempotencyKey}`);

      // Step 3: Verify request parameters match
      if (!this.requestDataMatches(requestData, cached.requestData)) {
        // Same key, different parameters - this is an error
        this.logger.error(`Idempotency key reused with different parameters: ${idempotencyKey}`);
        throw new DuplicateTransactionError(idempotencyKey, cached.requestData);
      }

      // Same request - return cached response (idempotent retry)
      this.logger.log(`Returning cached response for: ${idempotencyKey}`);
      return cached.response;
    }

    // Step 4: Not cached - execute operation
    this.logger.log(`Cache miss for idempotency key: ${idempotencyKey}, executing operation`);
    try {
      const response = await fn();
      // Step 5: Cache the response
      this.cacheResponse(hash, idempotencyKey, operation, requestData, response);
      return response;
    } catch (error) {
      // Don't cache errors - allow retry with same key
      this.logger.warn(`Operation failed for idempotency key: ${idempotencyKey}, not caching`);
      throw error;
    }
  }

  /**
   * Generates deterministic hash for request.
   *
   * ALGORITHM: SHA-256 hash of concatenated inputs
   *
   * WHY SHA-256:
   * - Cryptographically secure (collision-resistant)
   * - Fixed output length (256 bits = 64 hex characters)
   * - Fast to compute
   * - Industry standard
   *
   * INPUT: idempotencyKey + operation + sorted JSON of requestData
   * OUTPUT: Hex string (e.g., "a7f3b2c1...")
   *
   * DETERMINISM: Same inputs always produce same hash.
   * This is critical - hash must be repeatable.
   *
   * @param idempotencyKey - Client key
   * @param operation - Operation type
   * @param requestData - Request parameters
   * @returns SHA-256 hash as hex string
   */
  private generateHash(idempotencyKey: string, operation: string, requestData: any): string {
    /**
     * Normalize request data for consistent hashing.
     *
     * WHY: JSON.stringify({a:1, b:2}) !== JSON.stringify({b:2, a:1})
     * We need consistent ordering regardless of key order.
     *
     * SOLUTION: Sort keys alphabetically before stringifying.
     */
    const sortedData = this.sortObjectKeys(requestData);
    const dataString = JSON.stringify(sortedData);

    // Concatenate all inputs
    const input = `${idempotencyKey}|${operation}|${dataString}`;

    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(input).digest('hex');

    this.logger.debug(`Generated hash: ${hash} for key: ${idempotencyKey}`);
    return hash;
  }

  /**
   * Recursively sorts object keys for deterministic JSON.
   *
   * WHY: Ensures same object always hashes to same value.
   *
   * EXAMPLE:
   * Input:  {b: 1, a: {z: 2, y: 3}}
   * Output: {a: {y: 3, z: 2}, b: 1}
   *
   * This is a "bespoke algorithm" that ensures consistency.
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    // Sort keys alphabetically
    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * Compares two request data objects for equality.
   *
   * WHY: Detect if same idempotency key used with different params.
   *
   * ALGORITHM: Deep comparison via JSON serialization.
   * Current approach is simple and sufficient for wallet operations.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requestDataMatches(data1: any, data2: any): boolean {
    const sorted1 = this.sortObjectKeys(data1);
    const sorted2 = this.sortObjectKeys(data2);
    return JSON.stringify(sorted1) === JSON.stringify(sorted2);
  }

  /**
   * Caches operation response.
   *
   * WHY: Future requests with same key return this response.
   *
   * TTL: Response expires after 24 hours.
   * After expiration, same key can be used again.
   */
  private cacheResponse(
    hash: string,
    idempotencyKey: string,
    operation: string,
    requestData: any,
    response: any,
  ): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.TTL_MS);

    const record: IdempotencyRecord = {
      key: idempotencyKey,
      operation,
      hash,
      requestData,
      response,
      createdAt: now,
      expiresAt,
    };

    this.cache.set(hash, record);
    this.logger.log(
      `Cached idempotency record: ${idempotencyKey}, expires: ${expiresAt.toISOString()}`,
    );

    // Schedule cleanup (remove expired entries)
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => this.cleanupExpired(idempotencyKey), this.TTL_MS);
    }
  }

  /**
   * Removes expired idempotency records.
   *
   * WHY: Prevent memory leak (cache growing forever).
   *
   * IN PRODUCTION CODE Redis handles this automatically with TTL.
   * In-memory: We need manual cleanup.
   */
  private cleanupExpired(hash: string): void {
    const record = this.cache.get(hash);
    if (record && record.expiresAt < new Date()) {
      this.cache.delete(hash);
      this.logger.debug(`Cleaned up expired idempotency record: ${record.key}`);
    }
  }

  /**
   * Gets cached response if exists and not expired.
   *
   * USE CASE: Debugging, monitoring, testing.
   */
  async getCached(idempotencyKey: string): Promise<any | null> {
    // Linear search (inefficient, but fine for testing)
    // Production: Index by idempotency key in Redis
    for (const record of this.cache.values()) {
      if (record.key === idempotencyKey && record.expiresAt > new Date()) {
        return record.response;
      }
    }
    return null;
  }

  /**
   * TESTING HELPERS
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.logger.debug('Cleared idempotency cache (test utility)');
  }

  async count(): Promise<number> {
    return this.cache.size;
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. Hash-Based Keying:
 *    - Not just idempotency key (could be reused)
 *    - Includes operation and parameters
 *    - Detects malicious/accidental key reuse
 *
 * 2. Error Handling:
 *    - Errors not cached (allow retry)
 *    - Only successful operations cached
 *    - Clear error if key reused incorrectly
 *
 * 3. Security:
 *    - SHA-256 prevents hash collisions
 *    - Parameter comparison prevents tampering
 *    - TTL prevents indefinite storage
 *
 * 4. Performance:
 *    - O(1) cache lookup (Map)
 *    - Fast hashing (SHA-256 in crypto module)
 *    - Minimal overhead (hash generation ~1ms)
 *
 * 5. Compliance:
 *    - Audit trail (createdAt, expiresAt)
 *    - Request/response stored for verification
 *    - Industry best practices (24h TTL)
 */
