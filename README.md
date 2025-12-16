# Wallet Service Architecture

## Overview

The Wallet Service is built using a clean, layered architecture that separates concerns and promotes maintainability, testability, and scalability.

## Engineering Notes

This solution intentionally implements features like idempotency, optimistic locking, and deep test coverage to demonstrate real-world considerations in financial systems.

For a take-home exercise, some of these could be simplified, but including them shows how the system could scale and remain robust in production.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          HTTP / REST API Layer          │
│         (Controllers + DTOs)            │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        Business Logic Layer             │
│   (Services + Domain Entities)          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        Data Access Layer                │
│    (Repositories + Interfaces)          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          Storage Layer                  │
│   (In-Memory / PostgreSQL / Redis)      │
└─────────────────────────────────────────┘
```

## Key Components

### 1. Controllers (HTTP Layer)

- **Responsibility**: Handle HTTP requests/responses
- **Location**: `src/wallet/controllers/`
- **Examples**: `wallet.controller.ts`
- **Key Patterns**:
  - RESTful route design
  - Input validation via DTOs
  - Consistent response format
  - Error handling delegation

### 2. Services (Business Logic)

- **Responsibility**: Implement business rules
- **Location**: `src/wallet/services/`
- **Examples**:
  - `wallet.service.ts` - Core wallet operations
  - `transaction.service.ts` - Transaction management
  - `idempotency.service.ts` - Duplicate prevention
- **Key Patterns**:
  - Single Responsibility Principle
  - Dependency Injection
  - Transaction coordination
  - Error handling

### 3. Repositories (Data Access)

- **Responsibility**: Abstract storage operations
- **Location**: `src/wallet/repositories/`
- **Examples**:
  - `wallet.repository.interface.ts` - Contract
  - `wallet.repository.ts` - In-memory implementation
  - `transaction.repository.ts` - Transaction storage
- **Key Patterns**:
  - Repository pattern
  - Interface segregation
  - Optimistic locking
  - Batch operations

### 4. Entities (Domain Models)

- **Responsibility**: Represent business concepts
- **Location**: `src/wallet/entities/`
- **Examples**:
  - `wallet.entity.ts` - Wallet domain model
  - `transaction.entity.ts` - Transaction model
- **Key Patterns**:
  - Rich domain models
  - Business rule encapsulation
  - Validation in entities

### 5. DTOs (Data Transfer Objects)

- **Responsibility**: Define API contracts
- **Location**: `src/wallet/dto/`
- **Key Patterns**:
  - Validation decorators
  - Separate request/response DTOs
  - API documentation

## Design Principles

### SOLID Principles

1. **Single Responsibility**: Each class has one reason to change
2. **Open/Closed**: Open for extension, closed for modification
3. **Liskov Substitution**: Interfaces enable swappable implementations
4. **Interface Segregation**: Small, focused interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions

### Domain-Driven Design

- Rich domain models (not anemic)
- Business logic in entities and services
- Ubiquitous language (Wallet, Transaction, Transfer)
- Domain-specific errors

### Clean Architecture

- Dependency rule (inner layers don't know outer layers)
- Testable (can test business logic without HTTP/DB)
- Flexible (swap implementations easily)

## Data Flow

### Creating a Wallet

```
HTTP POST /wallets
    ↓
WalletController.createWallet()
    ↓
ValidationPipe (validate DTO)
    ↓
WalletService.createWallet()
    ↓
new Wallet() (create entity)
    ↓
WalletRepository.create() (persist)
    ↓
Map to WalletResponseDto
    ↓
Return HTTP 201 with data
```

### Transferring Funds

```
HTTP POST /wallets/:id/transfer
    ↓
WalletController.transferFunds()
    ↓
ValidationPipe (validate DTO)
    ↓
IdempotencyService.processWithIdempotency()
    ↓ (if not cached)
WalletService.transferFunds()
    ↓
WalletRepository.findByIds() (get both wallets)
    ↓
Validate business rules
    ↓
sourceWallet.deduct() (domain logic)
    ↓
targetWallet.fund() (domain logic)
    ↓
WalletRepository.update() x2 (with optimistic locking)
    ↓
TransactionService.createTransferTransaction()
    ↓
TransactionRepository.create()
    ↓
Map to TransferResponseDto
    ↓
Return HTTP 200 with data
```

## Error Handling

Errors flow through these layers:

1. **Domain Layer**: Throw domain-specific errors
   - `InsufficientBalanceError`
   - `WalletNotFoundError`
   - etc.

2. **Service Layer**: Let errors bubble up

3. **Controller Layer**: Caught by GlobalExceptionFilter

4. **Exception Filter**: Maps errors to HTTP responses
   - Domain errors → Appropriate HTTP status
   - Validation errors → 422
   - Not found → 404
   - Unknown errors → 500

## Concurrency Control

### Optimistic Locking

```
1. Read wallet (version: 1)
2. Modify balance
3. Update WHERE version = 1
4. If failed: Retry with fresh data
```

### Idempotency

```
1. Hash (key + operation + params)
2. Check cache
3. If cached: Return cached result
4. If not: Execute and cache
```

## Scaling Strategy

### Current: In-Memory (MVP)

- Single process
- No persistence
- Perfect for demos/testing

### Phase 1: PostgreSQL (Production)

- Replace repository implementation
- Add connection pooling
- Enable transactions
- Zero service changes!

### Phase 2: Distributed (Scale)

- Redis for idempotency cache
- Redis for distributed locks
- Load balancer

### Phase 3: Microservices

- Split services
- Message queue (RabbitMQ/Kafka)
- Event sourcing
- CQRS

## Testing Strategy

### Unit Tests

- Test each component in isolation
- Mock dependencies
- Fast execution
- High coverage (85%+)

### Integration Tests

- Test through HTTP layer
- Real database (test DB)
- End-to-end workflows
- API contract validation

### Test Pyramid

```
     /\
    /  \  E2E (few)
   /____\
  /      \ Integration (some)
 /________\
/          \ Unit (many)
```

## Monitoring & Observability

### Logging

- Structured JSON logs
- Correlation IDs
- Different levels (debug, info, warn, error)
- No sensitive data in logs

### Metrics

- Request rate
- Error rate
- Response time (p50, p95, p99)
- Business metrics (transfers/sec)

### Tracing

- Distributed tracing (future)
- Request flow visualization
- Performance bottleneck identification

## Security

### Current

- Input validation
- Amount limits
- Whitelist mode (unknown fields stripped)
- Safe error messages

### Future

- Authentication (JWT)
- Authorization (RBAC)
- Rate limiting
- Encryption at rest
- Audit logging

## Conclusion

This architecture prioritizes:

1. **Maintainability**: Clear structure, well-documented
2. **Testability**: All layers can be tested
3. **Scalability**: Easy to swap implementations
4. **Flexibility**: Can evolve without major rewrites

The layered approach with interfaces enables smooth migration from in-memory to production database without touching business logic.
\*/

## 🚀 Quick Start

### Step 1: Start the Application

```bash
cd wallet-service
npm install
npm run start:dev
```

**Expected Output:**

```
🚀 Application is running on: http://localhost:3000
📚 API Documentation: http://localhost:3000/api/docs
```
