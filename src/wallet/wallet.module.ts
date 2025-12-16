import { Module } from '@nestjs/common';
import { WalletController } from './controllers/wallet.controller';
import { WalletService } from './services/wallet.service';
import { TransactionService } from './services/transaction.service';
import { IdempotencyService } from './services/idempotency.service';
import { WalletRepository } from './repositories/wallet.repository';
import { TransactionRepository } from './repositories/transaction.repository';

/**
 * Wallet Module - Encapsulates wallet domain.
 *
 * WHY MODULES:
 * - Organize code by domain/feature
 * - Clear boundaries between features
 * - Encapsulate dependencies
 * - Enable lazy loading
 * - Easy to extract to microservice later
 *
 * STRUCTURE:
 * - Controllers: Handle HTTP requests
 * - Services: Business logic
 * - Repositories: Data access
 * - DTOs: Data transfer objects
 * - Entities: Domain models
 *
 * DEPENDENCY INJECTION:
 * - All dependencies registered as providers
 * - NestJS handles instantiation and injection
 * - Easy to swap implementations
 * - Easy to mock for testing
 */
@Module({
  controllers: [
    /**
     * Controllers handle HTTP layer.
     *
     * WHY: Separation of concerns
     * - HTTP-specific logic isolated
     * - Business logic in services
     * - Controllers are thin
     */
    WalletController,
  ],
  providers: [
    /**
     * Services contain business logic.
     *
     * DEPENDENCY ORDER:
     * - WalletService depends on repositories and other services
     * - TransactionService depends on repository
     * - IdempotencyService is standalone
     *
     * NestJS resolves dependencies automatically.
     */
    WalletService,
    TransactionService,
    IdempotencyService,

    /**
     * Repositories handle data access.
     *
     * INTERFACE BINDING:
     * We bind IWalletRepository interface to WalletRepository implementation.
     * This allows:
     * - WalletService to depend on interface (IWalletRepository)
     * - Easy to swap implementation (PostgresWalletRepository)
     * - Testing with mocks
     *
     * PATTERN: Dependency Inversion Principle (SOLID)
     */
    {
      provide: 'IWalletRepository', // Token for injection
      useClass: WalletRepository, // Concrete implementation
    },
    /**
     * ALTERNATIVE: Direct registration
     * If not using interface, simply list the repository:
     *
     * WalletRepository,
     *
     * Current approach with interface is more flexible.
     */
    WalletRepository, // Also register directly for direct injection
    TransactionRepository,
  ],
  exports: [
    /**
     * Export services if other modules need them.
     *
     * WHEN TO EXPORT:
     * - If other modules need to use WalletService
     * - If creating a shared module
     *
     * CURRENT: Not exported (wallet module is self-contained)
     *
     * FUTURE: If we add UserModule that needs wallet functionality,
     * we'd export WalletService here.
     */
    // WalletService,
    // TransactionService,
  ],
})
export class WalletModule {}

/**
 * DESIGN NOTES:
 *
 * 1. Module Organization:
 *    - Single responsibility (wallet domain)
 *    - Self-contained (doesn't leak implementation)
 *    - Clear API surface (controller endpoints)
 *
 * 2. Dependency Injection:
 *    - Interface-based for repositories
 *    - Constructor injection in services
 *    - NestJS handles lifecycle
 *
 * 3. Scalability:
 *    - Easy to add more controllers (AdminWalletController)
 *    - Easy to add more services (WalletAnalyticsService)
 *    - Easy to split into microservices (export and import)
 *
 * 4. Testing:
 *    - Can create TestWalletModule with mocks
 *    - Can override providers in tests
 *    - Isolated unit testing
 *
 *
 */
