import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVanMaintenanceDto {
  @IsString()
  @IsNotEmpty({ message: 'La fecha de la mantención es requerida' })
  date: string;

  @IsOptional()
  mileage?: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsNotEmpty({ message: 'El título o resumen de la mantención es requerido' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'La descripción de los trabajos realizados es requerida' })
  description: string;

  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  workshop?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imageName?: string;

  @IsString()
  @IsOptional()
  imagesJson?: string;

  @IsString()
  @IsOptional()
  performedBy?: string;

  @IsOptional()
  updateVanMileage?: boolean;

  @IsOptional()
  updateVanOil?: boolean;

  @IsOptional()
  updateVanTires?: boolean;

  @IsOptional()
  nextOilChangeKm?: number;
}
