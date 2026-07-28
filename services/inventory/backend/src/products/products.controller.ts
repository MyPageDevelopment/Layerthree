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
import { ProductsService } from './products.service';
import { ProductAuditService } from './product-audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductAuditResponseDto } from './dto/product-audit-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ModulesGuard } from '../auth/guards/modules.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditService: ProductAuditService,
  ) {}

  @Post()
  @Roles('SUPER_ADMIN', 'GERENTE')
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.create(createProductDto, user);
    return plainToInstance(ProductResponseDto, product, { excludeExtraneousValues: true });
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

  @Get('audit/all')
  @Roles('SUPER_ADMIN', 'GERENTE')
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
  @Roles('SUPER_ADMIN', 'GERENTE')
  async getAuditStats() {
    return this.auditService.getAuditStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findOne(id);
    return plainToInstance(ProductResponseDto, product, { excludeExtraneousValues: true });
  }

  @Get(':id/audit')
  @Roles('SUPER_ADMIN', 'GERENTE')
  async getProductAudit(@Param('id') id: string): Promise<ProductAuditResponseDto[]> {
    const audits = await this.auditService.getProductAuditHistory(id);
    return plainToInstance(ProductAuditResponseDto, audits, { excludeExtraneousValues: true });
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'GERENTE')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: any,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, updateProductDto, user);
    return plainToInstance(ProductResponseDto, product, { excludeExtraneousValues: true });
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.remove(id, user);
  }
}
