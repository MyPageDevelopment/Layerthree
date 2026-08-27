import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateVanDto {
  @IsString()
  @IsNotEmpty({ message: 'La patente es requerida' })
  plate: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre o alias de la camioneta es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  driver?: string;

  @IsString()
  @IsOptional()
  status?: string; // DISPONIBLE, EN_TERRENO, MANTENCION

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  mileage?: number;

  @IsOptional()
  lastOilChangeKm?: number;

  @IsOptional()
  nextOilChangeKm?: number;

  @IsOptional()
  lastOilChangeDate?: string;

  @IsOptional()
  lastTireChangeDate?: string;

  @IsOptional()
  technicalReviewDate?: string;

  @IsOptional()
  insuranceExpiryDate?: string;

  @IsOptional()
  permisoCirculacionDate?: string;
}
