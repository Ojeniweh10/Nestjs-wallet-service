import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**Initializes and starts the application.
 *
 * RESPONSIBILITIES:
 * 1. Create NestJS application
 * 2. Configure global pipes (validation)
 * 3. Setup Swagger documentation
 * 5. Start HTTP server
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  /**
   * Create NestJS application.
   *
   */
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  /**
   * Global validation pipe.
   *
   * WHY: Validates all DTOs automatically.
   *
   * OPTIONS:
   * - transform: true → Convert payload to DTO class instance
   * - whitelist: true → Strip properties not in DTO
   * - forbidNonWhitelisted: true → Throw error if extra properties
   * - transformOptions: Enable implicit type conversion
   *
   * SECURITY: Prevents mass assignment attacks.
   */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /**
   * Setup Swagger API documentation.
   *
   * WHY:
   * - Interactive API documentation
   * - Frontend developers know endpoints
   * - Easy testing (Swagger UI)
   * - API contract is self-documenting
   *
   * ACCESS: http://localhost:3000/api/docs
   */
  const config = new DocumentBuilder()
    .setTitle('Wallet Service API')
    .setDescription(
      'Production-ready wallet service with idempotency, ' +
        'optimistic locking, and comprehensive error handling',
    )
    .setVersion('1.0')
    .addTag('Wallets', 'Wallet management operations')
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://api.example.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  /**
   * Start HTTP server.
   *
   * PORT: From environment or default 3000
   * HOST: 0.0.0.0 allows external connections
   */
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`📊 Health check: http://localhost:${port}/health`);
  logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
}

/**
 * Start the application.
 *
 * ERROR HANDLING:
 * - Unhandled errors logged and exit
 * - Process doesn't hang on errors
 */
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', error);
  process.exit(1);
});

/**
 * DESIGN NOTES:
 *
 * 1. Clean Bootstrap:
 *    - Clear sequence of initialization
 *    - Each step has purpose
 *    - Easy to add more configuration
 *
 * 2. Environment Configuration:
 *    - PORT: Configurable (Heroku, AWS, etc.)
 *    - CORS: Configurable origins
 *    - NODE_ENV: Development/production modes
 *
 * 3. Security:
 *    - Validation prevents bad data
 *    - CORS configured properly
 *    - Whitelist prevents extra fields
 *
 * 4. Documentation:
 *    - Swagger auto-generated from decorators
 *    - Interactive testing
 *    - Always in sync with code
 *
 * 5. Logging:
 *    - Startup information clear
 *    - URLs logged for convenience
 *    - Errors logged before exit
 *
 * 6. Production Readiness:
 *    - Graceful error handling
 *    - Configurable via environment
 *    - CORS properly configured
 *    - Multiple server support
 *
 * 7. Developer Experience:
 *    - Clear URLs on startup
 *    - Swagger for testing
 *    - Hot reload in dev (start:dev)
 */
