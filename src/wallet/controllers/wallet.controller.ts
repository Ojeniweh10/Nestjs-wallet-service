import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseFilters,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';
import {
  CreateWalletDto,
  FundWalletDto,
  TransferFundsDto,
  WalletResponseDto,
  WalletDetailsResponseDto,
  TransferResponseDto,
  ApiResponse as ApiResponseDto,
} from '../dto';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';

/**
 * Wallet Controller - Handles HTTP requests for wallet operations.
 *
 * RESPONSIBILITIES:
 * - Define API routes and HTTP methods
 * - Validate request payloads (via ValidationPipe)
 * - Handle HTTP-specific concerns (status codes, headers)
 * - Delegate business logic to WalletService
 * - Return consistent API responses
 *
 * DESIGN PRINCIPLES:
 * - Thin controller (no business logic)
 * - RESTful routes
 * - Consistent response format
 * - Comprehensive API documentation (Swagger)
 */
@Controller('wallets')
@ApiTags('Wallets')
@UseFilters(GlobalExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * POST /wallets
   * Creates a new wallet.
   *
   * HTTP METHOD: POST (creating a resource)
   * STATUS: 201 Created (resource created successfully)
   *
   * BUSINESS FLOW:
   * 1. Validate request body (ValidationPipe)
   * 2. Delegate to WalletService
   * 3. Return created wallet
   *
   * ERROR SCENARIOS:
   * - 400 Bad Request: Invalid payload
   * - 422 Unprocessable Entity: Validation errors (negative balance, etc.)
   * - 500 Internal Server Error: Unexpected errors
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new wallet',
    description: 'Creates a new wallet with optional initial balance and currency',
  })
  @ApiBody({ type: CreateWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Wallet created successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error (e.g., negative initial balance)',
  })
  async createWallet(@Body() dto: CreateWalletDto): Promise<ApiResponseDto<WalletResponseDto>> {
    this.logger.log('POST /wallets - Creating new wallet');

    const wallet = await this.walletService.createWallet(dto);

    return {
      success: true,
      data: wallet,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /wallets
   * Lists all wallets.
   *
   * HTTP METHOD: GET (reading resources)
   * STATUS: 200 OK
   *
   * USE CASE: Admin dashboard, testing, development
   *
   */
  @Get()
  @ApiOperation({
    summary: 'List all wallets',
    description: 'Retrieves all wallets in the system (use pagination in production)',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallets retrieved successfully',
    type: [WalletResponseDto],
  })
  async listWallets(): Promise<ApiResponseDto<WalletResponseDto[]>> {
    this.logger.log('GET /wallets - Listing all wallets');

    const wallets = await this.walletService.listWallets();

    return {
      success: true,
      data: wallets,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /wallets/:id
   * Retrieves a single wallet by ID.
   *
   * HTTP METHOD: GET (reading a specific resource)
   * STATUS: 200 OK
   *
   * ERROR SCENARIOS:
   * - 404 Not Found: Wallet doesn't exist
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get wallet by ID',
    description: 'Retrieves a specific wallet by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Wallet ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet retrieved successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
  async getWallet(@Param('id') id: string): Promise<ApiResponseDto<WalletResponseDto>> {
    this.logger.log(`GET /wallets/${id} - Retrieving wallet`);

    const wallet = await this.walletService.getWallet(id);

    return {
      success: true,
      data: wallet,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /wallets/:id/details
   * Retrieves wallet with transaction history.
   *
   * HTTP METHOD: GET (reading a resource)
   * STATUS: 200 OK
   *
   * WHY SEPARATE ENDPOINT:
   * - Different use case (detailed view vs summary)
   * - Performance (includes transaction query)
   * - Client can choose which endpoint to call
   *
   * ALTERNATIVE DESIGN:
   * - Could use query param: GET /wallets/:id?include=transactions
   * - Current design is more explicit and discoverable
   *
   * ERROR SCENARIOS:
   * - 404 Not Found: Wallet doesn't exist
   */
  @Get(':id/details')
  @ApiOperation({
    summary: 'Get wallet details with transaction history',
    description: 'Retrieves wallet information along with recent transactions',
  })
  @ApiParam({
    name: 'id',
    description: 'Wallet ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet details retrieved successfully',
    type: WalletDetailsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
  async getWalletDetails(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<WalletDetailsResponseDto>> {
    this.logger.log(`GET /wallets/${id}/details - Retrieving wallet details`);

    const details = await this.walletService.getWalletDetails(id);

    return {
      success: true,
      data: details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /wallets/:id/fund
   * Adds funds to a wallet.
   *
   * HTTP METHOD: POST (creating a transaction)
   * STATUS: 200 OK (resource modified successfully)
   *
   * WHY POST not PUT/PATCH:
   * - We're creating a transaction (side effect)
   * - Not replacing wallet (PUT) or modifying fields (PATCH)
   * - POST is most semantically correct for "action" endpoints
   *
   * IDEMPOTENCY:
   * - Requires idempotency key in body
   * - Same key = same result (safe to retry)
   * - Critical for financial operations
   *
   * ERROR SCENARIOS:
   * - 404 Not Found: Wallet doesn't exist
   * - 400 Bad Request: Invalid payload
   * - 422 Unprocessable Entity: Amount validation error
   * - 409 Conflict: Duplicate transaction (idempotency key reused)
   */
  @Post(':id/fund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fund a wallet',
    description: 'Adds funds to a wallet with idempotency support',
  })
  @ApiParam({
    name: 'id',
    description: 'Wallet ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: FundWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet funded successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error (e.g., negative amount)',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate transaction (idempotency key conflict)',
  })
  async fundWallet(
    @Param('id') id: string,
    @Body() dto: FundWalletDto,
  ): Promise<ApiResponseDto<WalletResponseDto>> {
    this.logger.log(`POST /wallets/${id}/fund - Funding wallet with ${dto.amount}`);

    const wallet = await this.walletService.fundWallet(id, dto);

    return {
      success: true,
      data: wallet,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /wallets/:id/transfer
   * Transfers funds from one wallet to another.
   *
   * HTTP METHOD: POST (creating a transaction)
   * STATUS: 200 OK
   *
   * DESIGN DECISION: Source wallet in URL, target in body.
   *
   * WHY:
   * - RESTful: Action on source wallet (/wallets/:id/transfer)
   * - Clear which wallet is being acted upon
   * - URL identifies resource, body contains action parameters
   *
   *
   * Current design is best balance of REST principles and usability.
   *
   * IDEMPOTENCY:
   * - Required idempotency key
   * - Prevents duplicate transfers
   * - Safe to retry on network errors
   *
   * ERROR SCENARIOS:
   * - 404 Not Found: Source or target wallet doesn't exist
   * - 422 Unprocessable Entity: Insufficient balance, validation errors
   * - 409 Conflict: Duplicate transaction, concurrent modification
   */
  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer funds between wallets',
    description: 'Transfers funds from one wallet to another with idempotency support',
  })
  @ApiParam({
    name: 'id',
    description: 'Source wallet ID (sender)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: TransferFundsDto })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully',
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Source or target wallet not found',
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error (e.g., insufficient balance, same wallet transfer)',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate transaction or concurrent modification',
  })
  async transferFunds(
    @Param('id') id: string,
    @Body() dto: TransferFundsDto,
  ): Promise<ApiResponseDto<TransferResponseDto>> {
    this.logger.log(
      `POST /wallets/${id}/transfer - Transferring ${dto.amount} to ${dto.targetWalletId}`,
    );

    const result = await this.walletService.transferFunds(id, dto);

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * DESIGN NOTES:
 *
 * 1. RESTful Design:
 *    - Proper HTTP methods (GET, POST)
 *    - Proper status codes (200, 201, 404, 422)
 *    - Resource-oriented URLs
 *    - Addresses "originality in routing" feedback
 *
 * 2. Comprehensive Documentation:
 *    - Swagger annotations for every endpoint
 *    - Examples in decorators
 *    - Clear descriptions
 *    - All response codes documented
 *
 * 3. Consistent Response Format:
 *    - All responses wrapped in ApiResponse<T>
 *    - Includes success flag, data, timestamp
 *    - Frontend knows what to expect
 *
 * 4. Validation:
 *    - ValidationPipe validates DTOs automatically
 *    - Transform: true (converts strings to numbers)
 *    - Whitelist: true (strips unknown properties)
 *
 * 5. Error Handling:
 *    - GlobalExceptionFilter handles all errors
 *    - Controller doesn't need try/catch
 *    - Consistent error format
 *
 * 6. Logging:
 *    - Every endpoint logged with params
 *    - Helps with debugging production issues
 *    - Can correlate with service logs
 *
 * 7. Thin Controller:
 *    - No business logic
 *    - Delegates to service
 *    - Easy to test
 *    - Single responsibility
 *
 * 8. Type Safety:
 *    - Strong typing on all parameters
 *    - DTOs enforce structure
 *    - TypeScript catches errors at compile time
 *
 * 9. Endpoint Design Philosophy:
 *    - GET /wallets - List (collection)
 *    - POST /wallets - Create (collection)
 *    - GET /wallets/:id - Read (resource)
 *    - GET /wallets/:id/details - Read detailed (resource + relations)
 *    - POST /wallets/:id/fund - Action on resource
 *    - POST /wallets/:id/transfer - Action on resource
 *
 */
