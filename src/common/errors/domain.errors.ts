import { BaseError } from './base.error';
import { ErrorCode } from './error-codes.enum';

export class WalletNotFoundError extends BaseError {
  constructor(walletId: string) {
    super(ErrorCode.WALLET_NOT_FOUND, `Wallet with ID '${walletId}' not found`, { walletId });
  }
}

export class WalletAlreadyExistsError extends BaseError {
  constructor(walletId: string) {
    super(ErrorCode.WALLET_ALREADY_EXISTS, `Wallet with ID '${walletId}' already exists`, {
      walletId,
    });
  }
}

export class InsufficientBalanceError extends BaseError {
  constructor(walletId: string, required: number, available: number) {
    super(
      ErrorCode.INSUFFICIENT_BALANCE,
      `Insufficient balance in wallet '${walletId}'. Required: ${required}, Available: ${available}`,
      {
        walletId,
        required,
        available,
        shortfall: required - available,
      },
    );
  }
}

export class DuplicateTransactionError extends BaseError {
  constructor(idempotencyKey: string, originalRequest: any) {
    super(
      ErrorCode.DUPLICATE_TRANSACTION,
      `Transaction with idempotency key '${idempotencyKey}' already exists with different parameters`,
      {
        idempotencyKey,
        originalRequest,
      },
    );
  }
}

export class InvalidTransactionAmountError extends BaseError {
  constructor(amount: number, reason: string) {
    super(
      ErrorCode.INVALID_TRANSACTION_AMOUNT,
      `Invalid transaction amount: ${amount}. ${reason}`,
      { amount, reason },
    );
  }
}

export class SameWalletTransferError extends BaseError {
  constructor(walletId: string) {
    super(
      ErrorCode.SAME_WALLET_TRANSFER,
      `Cannot transfer funds to the same wallet '${walletId}'`,
      { walletId },
    );
  }
}

export class ConcurrentModificationError extends BaseError {
  constructor(resource: string, resourceId: string) {
    super(
      ErrorCode.CONCURRENT_MODIFICATION,
      `Concurrent modification detected for ${resource} '${resourceId}'. Please retry.`,
      {
        resource,
        resourceId,
        retryable: true,
      },
    );
  }
}

export class RepositoryError extends BaseError {
  constructor(operation: string, details?: string) {
    super(
      ErrorCode.REPOSITORY_ERROR,
      `Repository operation failed: ${operation}${details ? `. ${details}` : ''}`,
      {
        operation,
        details,
      },
    );
  }
}
