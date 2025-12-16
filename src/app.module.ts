import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from './wallet/wallet.module';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Root Application Module.
 *
 * RESPONSIBILITIES:
 * - Import feature modules
 * - Configure global providers
 * - Setup configuration
 * - Register global filters/interceptors
 *
 * DESIGN: Minimal root module
 * - Most logic in feature modules (WalletModule)
 * - Root just orchestrates modules
 * - Easy to add more modules
 */
@Module({
  imports: [
    /**
     * ConfigModule for environment variables.
     *
     * WHY:
     * - Centralized configuration
     * - Type-safe config access
     * - Environment-specific settings
     * - .env file support
     *
     * isGlobal: true means ConfigService available everywhere
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    /**
     * Feature modules.
     *
     * Current: Only WalletModule
     * Future: UserModule, AuthModule, PaymentModule, etc.
     */
    WalletModule,
  ],
  providers: [
    /**
     * Global exception filter.
     *
     * WHY: Handle all errors consistently across all modules.
     *
     * APP_FILTER token makes this filter global.
     * Catches all exceptions in any module.
     */
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
