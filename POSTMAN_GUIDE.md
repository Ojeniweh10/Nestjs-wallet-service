# Postman Collection Usage Guide

## 📥 Import Instructions

### Step 1: Download the Collection

Save the `NestJs Wallet Service.postman_collection.json` file to your computer.

### Step 2: Import into Postman

1. Open Postman
2. Click **"Import"** button (top left)
3. Choose **"Upload Files"** or drag & drop the JSON file
4. Click **"Import"**

### Step 3: Verify Import

You should see a new collection named **"NestJs Wallet Service"** in your Collections tab.

---

## 🎯 Collection Structure

```
📁 Wallet Service API - Complete Collection
│
├── 📂 1. Wallet Management (5 requests)
│   ├── ✉️ Create Wallet (Default Values)
│   ├── ✉️ Create Wallet (With Initial Balance)
│   ├── ✉️ Get Wallet by ID
│   ├── ✉️ List All Wallets
│   └── ✉️ Get Wallet Details (With Transaction History)
│
├── 📂 2. Wallet Operations (3 requests)
│   ├── ✉️ Fund Wallet
│   ├── ✉️ Fund Wallet - Idempotency Test
│   └── ✉️ Transfer Funds
│
└── 📂 3. Error Scenarios (6 requests)
    ├── ✉️ Insufficient Balance
    ├── ✉️ Wallet Not Found
    ├── ✉️ Negative Amount Validation
    ├── ✉️ Zero Amount Validation
    ├── ✉️ Same Wallet Transfer
    └── ✉️ Negative Initial Balance
```

**Total: 14 Requests** covering all endpoints and error scenarios

---

## 🚀 Quick Start

### 1. Start Your Application

```bash
cd wallet-service
npm install
npm run start:dev
```

Wait for the message:

```
🚀 Application is running on: http://localhost:3000
```

### 2. Run the Collection

In Postman, expand the collection and run requests in this order:

#### **Happy Path Flow:**

1. **Create Wallet (Default Values)**
   - Creates wallet 1 with $0 balance
   - Saves `walletId1` automatically

2. **Create Wallet (With Initial Balance)**
   - Creates wallet 2 with $500 balance
   - Saves `walletId2` automatically

3. **Fund Wallet**
   - Adds $100 to wallet 1
   - Balance: $0 → $100

4. **Transfer Funds**
   - Transfers $30 from wallet 1 to wallet 2
   - Wallet 1: $100 → $70
   - Wallet 2: $500 → $530

5. **Get Wallet Details**
   - View wallet 1 with transaction history
   - See both funding and transfer transactions

---

### 3️⃣ Dynamic Idempotency Keys

Requests use Postman's built-in variables:

- `{{$guid}}` - Generates unique UUID for each request
- `{{$timestamp}}` - Generates current timestamp

This means you can run requests multiple times without conflicts!

### 4️⃣ Example Responses

Many requests include **example responses** showing what to expect:

- Click on a request
- Look for "📄 Examples" in the right sidebar
- See sample success and error responses

---

## 🧪 Testing Scenarios

### Scenario 1: Test Idempotency (IMPORTANT!)

1. Run **"Fund Wallet - Idempotency Test"**
2. Note the wallet balance in the response
3. **Click "Send" again** (exact same request)
4. Balance should **NOT change** (idempotency working!)

**Why this matters:**

- Proves duplicate requests are handled safely
- Critical for financial systems
- Shows production-ready error handling

### Scenario 2: Test Error Handling

Run all requests in the **"3. Error Scenarios"** folder:

| Request                  | Expected Status | Error Code                 |
| ------------------------ | --------------- | -------------------------- |
| Insufficient Balance     | 422             | INSUFFICIENT_BALANCE       |
| Wallet Not Found         | 404             | WALLET_NOT_FOUND           |
| Negative Amount          | 422             | INVALID_TRANSACTION_AMOUNT |
| Zero Amount              | 422             | INVALID_TRANSACTION_AMOUNT |
| Same Wallet Transfer     | 422             | SAME_WALLET_TRANSFER       |
| Negative Initial Balance | 422             | Validation Error           |

**All errors return structured JSON with error codes and metadata!**

### Scenario 3: Test Transaction History

1. Create a wallet
2. Fund it multiple times (with different idempotency keys)
3. Transfer funds to another wallet
4. Run **"Get Wallet Details"**
5. See complete transaction history with:
   - Transaction references (TXN-timestamp-counter-random)
   - Transaction types (FUNDING, TRANSFER)
   - Amounts and timestamps

---

## 📊 Collection Variables

The collection uses these variables (managed automatically):

| Variable    | Description      | Example Value                        |
| ----------- | ---------------- | ------------------------------------ |
| `baseUrl`   | API base URL     | http://localhost:3000                |
| `walletId1` | First wallet ID  | 550e8400-e29b-41d4-a716-446655440000 |
| `walletId2` | Second wallet ID | 123e4567-e89b-12d3-a456-426614174001 |

**To view/edit variables:**

1. Click on the collection name
2. Go to "Variables" tab
3. See current values and scopes

---

## 🎨 Response Examples

### Success Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    // ... response data
  },
  "timestamp": "2025-01-15T12:00:00.123Z"
}
```

### Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "metadata": {
      // Additional error context
    },
    "timestamp": "2025-01-15T12:00:00.123Z"
  }
}
```

### Transfer Response (Most Complex)

```json
{
  "success": true,
  "data": {
    "sourceWallet": {
      "id": "...",
      "balance": 70,
      "version": 3
      // ...
    },
    "targetWallet": {
      "id": "...",
      "balance": 530,
      "version": 2
      // ...
    },
    "transaction": {
      "id": "...",
      "reference": "TXN-20250115120500-001-A7F3",
      "type": "TRANSFER",
      "amount": 30,
      "status": "COMPLETED"
      // ...
    }
  },
  "timestamp": "2025-01-15T12:05:00.123Z"
}
```

---

## 💡 Pro Tips

### 1. Use Runner for Automated Testing

1. Click **"Run"** button on the collection
2. Select which requests to run
3. Set iterations (how many times to run)
4. Click **"Run Wallet Service API"**
5. See aggregated test results

### 2. View Console Logs

- Open Postman Console (View → Show Postman Console)
- See detailed logs of each request
- See the `console.log()` statements from test scripts

### 3. Save Requests to History

- All requests are automatically saved to history
- Access via "History" tab in sidebar
- Useful for debugging

### 4. Export Test Results

After running the collection:

1. Click **"Export Results"**
2. Save as JSON or HTML
3. Share with team or include in documentation

### 5. Environment Variables (Optional)

Create different environments for:

- Local Development (http://localhost:3000)
- Staging (https://staging-api.example.com)
- Production (https://api.example.com)

Switch environments without changing requests!

---

## 🔍 Troubleshooting

### "Connection Refused" Error

**Problem:** Can't connect to http://localhost:3000

**Solution:**

```bash
# Make sure the application is running
cd wallet-service
npm run start:dev
```

### "walletId1 is not defined"

**Problem:** Variable not set

**Solution:**

1. Run **"Create Wallet (Default Values)"** first
2. Check test script ran successfully (green checkmarks)
3. Verify in Variables tab that `walletId1` has a value

### Idempotency Not Working

**Problem:** Balance increases on duplicate requests

**Solution:**

- Make sure you're using the **EXACT same idempotency key**
- Check you're not using `{{$guid}}` (which generates new UUID each time)
- Use a fixed key like `"test-idempotency-key-123"` for testing

---

## 📈 What to Test

### ✅ Basic Functionality

- [ ] Create wallet with defaults
- [ ] Create wallet with initial balance
- [ ] Get wallet by ID
- [ ] List all wallets
- [ ] Fund wallet
- [ ] Transfer funds
- [ ] Get wallet details with history

### ✅ Idempotency

- [ ] Duplicate fund request returns same balance
- [ ] Duplicate transfer request returns same result
- [ ] Different parameters with same key returns error

### ✅ Error Handling

- [ ] Insufficient balance error (422)
- [ ] Wallet not found error (404)
- [ ] Negative amount validation (422)
- [ ] Zero amount validation (422)
- [ ] Same wallet transfer error (422)
- [ ] All errors have proper structure and codes

### ✅ Business Logic

- [ ] Balance calculations are correct
- [ ] Version numbers increment on updates
- [ ] Transaction references follow pattern (TXN-...)
- [ ] Transaction history includes all operations
- [ ] Both wallets updated in transfer (atomic)

---

## 🎯 Success Criteria

After running the collection, you should see:

✅ All requests return expected status codes  
✅ All test assertions pass (green checkmarks)  
✅ Wallet IDs automatically saved to variables  
✅ Balances calculate correctly  
✅ Idempotency prevents duplicate operations  
✅ Errors return structured responses with codes  
✅ Transaction history tracks all operations

---

## 📚 Additional Resources

- **Swagger Docs:** http://localhost:3000/api/docs (Interactive API documentation)
- **README:** See project README.md for architecture details
- **Tests:** Run `npm test` to see 175+ automated tests

---

## 🎉 You're Ready!

This Postman collection provides everything you need to:

- Test all API endpoints
- Verify error handling
- Demonstrate idempotency
- Show transaction history
- Prove production-ready quality

**Import, run, and see the wallet service in action!** 🚀
