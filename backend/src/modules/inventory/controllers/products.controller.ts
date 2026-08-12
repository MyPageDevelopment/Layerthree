import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ProductsService } from '../services/products.service';
import { ProductAuditService } from '../services/product-audit.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductResponseDto } from '../dto/product-response.dto';
import { ProductAuditResponseDto } from '../dto/product-audit-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditService: ProductAuditService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.create(createProductDto, user);
    return plainToInstance(ProductResponseDto, product, { excludeExtraneousValues: true });
  }

  @Post('import-csv')
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  async importCsv(
    @Body('csvText') csvText: string,
    @CurrentUser() user: any,
  ) {
    return this.productsService.importCsvData(csvText, user);
  }

  @Get()
  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productsService.findAll();
    return plainToInstance(ProductResponseDto, products, { excludeExtraneousValues: true });
  }

  @Get('low-stock')
  getLowStock() {
    return this.productsService.getLowStock();
  }

  @Get('next-sku')
  getNextSku(
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
  ) {
    return this.productsService.getNextSku(category, subcategory);
  }

  @Get('audit/all')
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  async getAllAudits(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
  ): Promise<ProductAuditResponseDto[]> {
    const audits = await this.auditService.getAllAudits({
      userId,
      action,
      limit: limit ? parseInt(limit) : undefined,
    });
    return plainToInstance(ProductAuditResponseDto, audits, { excludeExtraneousValues: true });
  }

  @Get('audit/stats')
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  async getAuditStats() {
    return this.auditService.getAuditStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    return plainToInstance(ProductResponseDto, product, { excludeExtraneousValues: true });
  }

  @Get(':id/audit')
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  async getProductAudit(@Param('id') id: string): Promise<ProductAuditResponseDto[]> {
    const audits = await this.auditService.getProductAuditHistory(id);
    return plainToInstance(ProductAuditResponseDto, audits, { excludeExtraneousValues: true });
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, updateProductDto, user);
    return plainToInstance(ProductResponseDto, product, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'GERENTE', 'BODEGUERO')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.remove(id, user);
  }
}
