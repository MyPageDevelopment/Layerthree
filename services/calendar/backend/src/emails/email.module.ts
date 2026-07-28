import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';

@Global() // Hace que el servicio esté disponible en toda la aplicación
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
