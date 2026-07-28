import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CreateBulkMovementDto } from './dto/create-bulk-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ModulesGuard } from '../auth/guards/modules.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('movements')
@UseGuards(JwtAuthGuard, ModulesGuard, RolesGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'GERENTE')
  create(@Body() createMovementDto: CreateMovementDto, @Request() req) {
    return this.movementsService.create(createMovementDto, req.user.userId);
  }

  @Post('bulk')
  @Roles('SUPER_ADMIN', 'GERENTE')
  createBulk(@Body() createBulkMovementDto: CreateBulkMovementDto, @Request() req) {
    return this.movementsService.createBulk(createBulkMovementDto, req.user.userId);
  }

  @Get()
  findAll(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit, 10) : undefined;
    return this.movementsService.findAll(limitNumber);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.movementsService.findByProduct(productId);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.movementsService.findByProject(projectId);
  }
}
