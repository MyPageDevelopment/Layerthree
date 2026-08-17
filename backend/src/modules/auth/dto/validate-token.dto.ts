import { IsString } from 'class-validator';

export class ValidateTokenDto {
  @IsString({ message: 'El token es requerido' })
  token: string;
}
