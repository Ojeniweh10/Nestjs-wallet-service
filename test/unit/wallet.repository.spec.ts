import { Test, TestingModule } from '@nestjs/testing';
import { WalletRepository } from '../../src/wallet/repositories/wallet.repository';
import { Wallet, Currency } from '../../src/wallet/entities/wallet.entity';
import { WalletAlreadyExistsError } from '../../src/common/errors/domain.errors';

/**
 * Wallet Repository Unit Tests
 *
 * FOCUS:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Optimistic locking (version handling)
 * - Batch operations (findByIds)
 * - Version conflict detection
 * - Data integrity
 *
 * COVERAGE: 22+ tests
 */
describe('WalletRepository', () => {
  let repository: WalletRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletRepository],
    }).compile();

    repository = module.get<WalletRepository>(WalletRepository);

    // Clear repository
    await repository.clear();
  });

  /**
   * Test Suite: Create Operations
   */
  describe('create', () => {
    it('should create a new wallet', async () => {
      // Arrange
      const wallet = new Wallet('wallet-1', Currency.USD, 100);

      // Act
      const created = await repository.create(wallet);

      // Assert
      expect(created).toBeDefined();
      expect(created.id).toBe('wallet-1');
      expect(created.balance).toBe(100);
      expect(created.version).toBe(1);
    });

    it('should throw error when creating duplicate wallet', async () => {
      // Arrange
      const wallet1 = new Wallet('wallet-duplicate', Currency.USD, 100);
      await repository.create(wallet1);

      // Act & Assert
      const wallet2 = new Wallet('wallet-duplicate', Currency.USD, 200);
      await expect(repository.create(wallet2)).rejects.toThrow(WalletAlreadyExistsError);
    });

    it('should return a clone to prevent external mutations', async () => {
      // Arrange
      const wallet = new Wallet('wallet-clone', Currency.USD, 100);

      // Act
      const created = await repository.create(wallet);
      created.balance = 999; // Try to mutate returned wallet

      // Assert - Original in repository should be unchanged
      const stored = await repository.findById('wallet-clone');
      expect(stored!.balance).toBe(100); // Not 999!
    });

    it('should preserve all wallet properties', async () => {
      // Arrange
      const wallet = new Wallet('wallet-props', Currency.USD, 250);

      // Act
      const created = await repository.create(wallet);

      // Assert
      expect(created.id).toBe(wallet.id);
      expect(created.currency).toBe(wallet.currency);
      expect(created.balance).toBe(wallet.balance);
      expect(created.version).toBe(wallet.version);
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });
  });

  /**
   * Test Suite: Read Operations
   */
  describe('findById', () => {
    it('should find existing wallet by ID', async () => {
      // Arrange
      const wallet = new Wallet('wallet-find', Currency.USD, 100);
      await repository.create(wallet);

      // Act
      const found = await repository.findById('wallet-find');

      // Assert
      expect(found).toBeDefined();
      expect(found!.id).toBe('wallet-find');
      expect(found!.balance).toBe(100);
    });

    it('should return null for non-existent wallet', async () => {
      // Act
      const found = await repository.findById('non-existent');

      // Assert
      expect(found).toBeNull();
    });

    it('should return a clone to prevent external mutations', async () => {
      // Arrange
      const wallet = new Wallet('wallet-immutable', Currency.USD, 100);
      await repository.create(wallet);

      // Act
      const found = await repository.findById('wallet-immutable');
      found!.balance = 999; // Try to mutate

      // Assert - Repository data unchanged
      const refetch = await repository.findById('wallet-immutable');
      expect(refetch!.balance).toBe(100);
    });
  });

  describe('findByIds', () => {
    beforeEach(async () => {
      // Create test wallets
      await repository.create(new Wallet('wallet-1', Currency.USD, 100));
      await repository.create(new Wallet('wallet-2', Currency.USD, 200));
      await repository.create(new Wallet('wallet-3', Currency.USD, 300));
    });

    it('should find multiple wallets by IDs', async () => {
      // Act
      const wallets = await repository.findByIds(['wallet-1', 'wallet-2']);

      // Assert
      expect(wallets.size).toBe(2);
      expect(wallets.get('wallet-1')?.balance).toBe(100);
      expect(wallets.get('wallet-2')?.balance).toBe(200);
    });

    it('should return empty map when no IDs provided', async () => {
      // Act
      const wallets = await repository.findByIds([]);

      // Assert
      expect(wallets.size).toBe(0);
    });

    it('should only return existing wallets', async () => {
      // Act
      const wallets = await repository.findByIds(['wallet-1', 'non-existent', 'wallet-2']);

      // Assert - Should only find 2 out of 3
      expect(wallets.size).toBe(2);
      expect(wallets.has('wallet-1')).toBe(true);
      expect(wallets.has('wallet-2')).toBe(true);
      expect(wallets.has('non-existent')).toBe(false);
    });

    it('should handle duplicate IDs in request', async () => {
      // Act
      const wallets = await repository.findByIds(['wallet-1', 'wallet-1', 'wallet-2']);

      // Assert - Should return unique wallets
      expect(wallets.size).toBe(2);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no wallets exist', async () => {
      // Act
      const wallets = await repository.findAll();

      // Assert
      expect(wallets).toEqual([]);
    });

    it('should return all wallets', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-1', Currency.USD, 100));
      await repository.create(new Wallet('wallet-2', Currency.USD, 200));
      await repository.create(new Wallet('wallet-3', Currency.USD, 300));

      // Act
      const wallets = await repository.findAll();

      // Assert
      expect(wallets.length).toBe(3);
    });

    it('should return clones to prevent mutations', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-all', Currency.USD, 100));

      // Act
      const wallets = await repository.findAll();
      wallets[0].balance = 999;

      // Assert
      const refetch = await repository.findById('wallet-all');
      expect(refetch!.balance).toBe(100);
    });
  });

  describe('exists', () => {
    it('should return true for existing wallet', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-exists', Currency.USD, 100));

      // Act
      const exists = await repository.exists('wallet-exists');

      // Assert
      expect(exists).toBe(true);
    });

    it('should return false for non-existent wallet', async () => {
      // Act
      const exists = await repository.exists('non-existent');

      // Assert
      expect(exists).toBe(false);
    });
  });

  /**
   * Test Suite: Update Operations with Optimistic Locking
   */
  describe('update with Optimistic Locking', () => {
    it('should update wallet when version matches', async () => {
      // Arrange
      const wallet = new Wallet('wallet-update', Currency.USD, 100);
      await repository.create(wallet);

      // Modify wallet
      wallet.balance = 150;

      // Act
      const updated = await repository.update(wallet, 1); // Version 1

      // Assert
      expect(updated).toBe(true);

      const stored = await repository.findById('wallet-update');
      expect(stored!.balance).toBe(150);
      expect(stored!.version).toBe(2); // Version incremented
    });

    it('should return false when version does not match', async () => {
      // Arrange
      const wallet = new Wallet('wallet-conflict', Currency.USD, 100);
      await repository.create(wallet);

      // Modify wallet
      wallet.balance = 150;

      // Act - Try to update with wrong version
      const updated = await repository.update(wallet, 999); // Wrong version

      // Assert
      expect(updated).toBe(false);

      // Original balance should be unchanged
      const stored = await repository.findById('wallet-conflict');
      expect(stored!.balance).toBe(100);
      expect(stored!.version).toBe(1);
    });

    it('should detect concurrent modifications', async () => {
      // Arrange
      const wallet = new Wallet('wallet-concurrent', Currency.USD, 100);
      await repository.create(wallet);

      // Simulate concurrent updates
      const wallet1 = await repository.findById('wallet-concurrent');
      const wallet2 = await repository.findById('wallet-concurrent');

      // User 1 updates
      wallet1!.balance = 120;
      const update1 = await repository.update(wallet1!, 1);

      // User 2 tries to update with stale version
      wallet2!.balance = 130;
      const update2 = await repository.update(wallet2!, 1); // Version now 2, not 1

      // Assert
      expect(update1).toBe(true);
      expect(update2).toBe(false); // Concurrent modification detected

      // Final balance should be from first update
      const final = await repository.findById('wallet-concurrent');
      expect(final!.balance).toBe(120);
      expect(final!.version).toBe(2);
    });

    it('should increment version on successful update', async () => {
      // Arrange
      const wallet = new Wallet('wallet-version', Currency.USD, 100);
      await repository.create(wallet);

      // Act - Multiple updates
      wallet.balance = 110;
      await repository.update(wallet, 1);

      wallet.balance = 120;
      await repository.update(wallet, 2);

      wallet.balance = 130;
      await repository.update(wallet, 3);

      // Assert
      const final = await repository.findById('wallet-version');
      expect(final!.version).toBe(4);
      expect(final!.balance).toBe(130);
    });

    it('should return false when updating non-existent wallet', async () => {
      // Arrange
      const wallet = new Wallet('non-existent', Currency.USD, 100);

      // Act
      const updated = await repository.update(wallet, 1);

      // Assert
      expect(updated).toBe(false);
    });

    it('should update timestamp on successful update', async () => {
      // Arrange
      const wallet = new Wallet('wallet-timestamp', Currency.USD, 100);
      await repository.create(wallet);

      const originalTimestamp = wallet.updatedAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      wallet.balance = 150;
      await repository.update(wallet, 1);

      // Assert
      const updated = await repository.findById('wallet-timestamp');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });
  });

  /**
   * Test Suite: Delete Operations
   */
  describe('delete', () => {
    it('should delete existing wallet', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-delete', Currency.USD, 100));

      // Act
      const deleted = await repository.delete('wallet-delete');

      // Assert
      expect(deleted).toBe(true);

      const found = await repository.findById('wallet-delete');
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent wallet', async () => {
      // Act
      const deleted = await repository.delete('non-existent');

      // Assert
      expect(deleted).toBe(false);
    });

    it('should reduce count after deletion', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-1', Currency.USD, 100));
      await repository.create(new Wallet('wallet-2', Currency.USD, 200));

      const countBefore = await repository.count();

      // Act
      await repository.delete('wallet-1');
      const countAfter = await repository.count();

      // Assert
      expect(countBefore).toBe(2);
      expect(countAfter).toBe(1);
    });
  });

  /**
   * Test Suite: Utility Methods
   */
  describe('Utility Methods', () => {
    it('should count wallets correctly', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-1', Currency.USD, 100));
      await repository.create(new Wallet('wallet-2', Currency.USD, 200));
      await repository.create(new Wallet('wallet-3', Currency.USD, 300));

      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(3);
    });

    it('should return zero count when empty', async () => {
      // Act
      const count = await repository.count();

      // Assert
      expect(count).toBe(0);
    });

    it('should clear all wallets', async () => {
      // Arrange
      await repository.create(new Wallet('wallet-1', Currency.USD, 100));
      await repository.create(new Wallet('wallet-2', Currency.USD, 200));

      // Act
      await repository.clear();

      // Assert
      const count = await repository.count();
      expect(count).toBe(0);

      const wallets = await repository.findAll();
      expect(wallets).toEqual([]);
    });
  });

  /**
   * Test Suite: Data Integrity
   */
  describe('Data Integrity', () => {
    it('should maintain immutability of stored data', async () => {
      // Arrange
      const wallet = new Wallet('wallet-integrity', Currency.USD, 100);
      const created = await repository.create(wallet);

      // Act - Try to mutate returned wallet
      created.balance = 999;
      created.version = 999;

      // Assert - Repository should have original values
      const stored = await repository.findById('wallet-integrity');
      expect(stored!.balance).toBe(100);
      expect(stored!.version).toBe(1);
    });

    it('should handle rapid sequential operations', async () => {
      // Arrange & Act - Rapid fire operations
      const wallet = new Wallet('wallet-rapid', Currency.USD, 100);
      await repository.create(wallet);

      for (let i = 0; i < 10; i++) {
        const current = await repository.findById('wallet-rapid');
        current!.balance += 10;
        await repository.update(current!, current!.version);
      }

      // Assert
      const final = await repository.findById('wallet-rapid');
      expect(final!.balance).toBe(200); // 100 + (10 * 10)
      expect(final!.version).toBe(11); // 1 + 10 updates
    });

    it('should preserve decimal precision', async () => {
      // Arrange
      const wallet = new Wallet('wallet-decimal', Currency.USD, 99.99);
      await repository.create(wallet);

      // Act
      wallet.balance = 199.99;
      await repository.update(wallet, 1);

      // Assert
      const stored = await repository.findById('wallet-decimal');
      expect(stored!.balance).toBe(199.99);
    });
  });
});

/**
 * TEST STATISTICS:
 * - Total Tests: 29
 * - Create Operations: 4 tests
 * - Read Operations: 11 tests
 * - Update Operations: 6 tests
 * - Delete Operations: 3 tests
 * - Utility Methods: 3 tests
 * - Data Integrity: 3 tests
 *
 * COVERAGE AREAS:
 * ✅ All CRUD operations tested
 * ✅ Optimistic locking thoroughly tested
 * ✅ Concurrent modification scenarios
 * ✅ Batch operations (findByIds)
 * ✅ Data immutability verified
 * ✅ Edge cases covered
 *
 * DEMONSTRATES:
 * - Optimistic locking pattern
 * - Version conflict detection
 * - Data integrity maintenance
 * - Defensive copying (immutability)
 * - Concurrent operation handling
 */
