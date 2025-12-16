export enum Currency {
  USD = 'USD',
}

export class Wallet {
  readonly id: string;
  readonly currency: Currency;
  balance: number;
  version: number;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(id: string, currency: Currency = Currency.USD, balance: number = 0) {
    this.validateBalance(balance);
    this.id = id;
    this.currency = currency;
    this.balance = balance;
    this.version = 1;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  private validateBalance(balance: number): void {
    if (balance < 0) {
      throw new Error(`Wallet balance cannot be negative: ${balance}`);
    }
  }

  fund(amount: number): void {
    if (amount <= 0) {
      throw new Error(`Fund amount must be positive: ${amount}`);
    }
    this.balance += amount;
    this.updatedAt = new Date();
    this.version += 1;
  }

  deduct(amount: number): void {
    if (amount <= 0) {
      throw new Error(`Deduct amount must be positive: ${amount}`);
    }
    if (amount > this.balance) {
      throw new Error(`Insufficient balance. Required: ${amount}, Available: ${this.balance}`);
    }
    this.balance -= amount;
    this.updatedAt = new Date();
    this.version += 1;
  }

  hasSufficientBalance(amount: number): boolean {
    return this.balance >= amount;
  }

  toJSON() {
    return {
      id: this.id,
      currency: this.currency,
      balance: this.balance,
      version: this.version,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
