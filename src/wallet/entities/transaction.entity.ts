export enum TransactionType {
  FUNDING = 'FUNDING',
  TRANSFER = 'TRANSFER',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export class Transaction {
  readonly id: string;
  readonly reference: string;
  readonly type: TransactionType;
  readonly sourceWalletId: string | null;
  readonly targetWalletId: string;
  readonly amount: number;
  readonly currency: string;
  status: TransactionStatus;
  readonly metadata?: Record<string, any>;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id: string;
    reference: string;
    type: TransactionType;
    sourceWalletId: string | null;
    targetWalletId: string;
    amount: number;
    currency: string;
    status?: TransactionStatus;
    metadata?: Record<string, any>;
  }) {
    this.validateAmount(params.amount);
    this.validateTransactionType(params);

    this.id = params.id;
    this.reference = params.reference;
    this.type = params.type;
    this.sourceWalletId = params.sourceWalletId;
    this.targetWalletId = params.targetWalletId;
    this.amount = params.amount;
    this.currency = params.currency;
    this.status = params.status || TransactionStatus.COMPLETED;
    this.metadata = params.metadata;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error(`Transaction amount must be positive: ${amount}`);
    }
  }

  private validateTransactionType(params: {
    type: TransactionType;
    sourceWalletId: string | null;
    targetWalletId: string;
  }): void {
    if (params.type === TransactionType.FUNDING && params.sourceWalletId) {
      throw new Error('Funding transactions should not have a source wallet');
    }

    if (params.type === TransactionType.TRANSFER && !params.sourceWalletId) {
      throw new Error('Transfer transactions must have a source wallet');
    }
  }

  markAsFailed(): void {
    this.status = TransactionStatus.FAILED;
    this.updatedAt = new Date();
  }

  markAsCompleted(): void {
    this.status = TransactionStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  involvesWallet(walletId: string): boolean {
    return this.sourceWalletId === walletId || this.targetWalletId === walletId;
  }

  getImpactForWallet(walletId: string): 'credit' | 'debit' | null {
    if (this.targetWalletId === walletId && this.sourceWalletId !== walletId) {
      return 'credit';
    }
    if (this.sourceWalletId === walletId && this.targetWalletId !== walletId) {
      return 'debit';
    }
    return null;
  }

  toJSON() {
    return {
      id: this.id,
      reference: this.reference,
      type: this.type,
      sourceWalletId: this.sourceWalletId,
      targetWalletId: this.targetWalletId,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
