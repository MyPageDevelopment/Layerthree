import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initTransporter();
  }

  async onModuleInit() {
    if (this.transporter) {
      try {
        await this.transporter.verify();
        this.logger.log('✅ Conexión SMTP verificada y lista para enviar correos.');
      } catch (err) {
        this.logger.error('❌ Error al verificar conexión con servidor SMTP:', err);
      }
    }
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST') || process.env.SMTP_HOST;
    const portStr = this.configService.get<string>('SMTP_PORT') || process.env.SMTP_PORT;
    const user = this.configService.get<string>('SMTP_USER') || process.env.SMTP_USER;
    const rawPass = this.configService.get<string>('SMTP_PASS') || process.env.SMTP_PASS;
    const secureStr = this.configService.get<string>('SMTP_SECURE') || process.env.SMTP_SECURE;

    if (!host || !user || !rawPass) {
      this.logger.warn('⚠️ Configuración SMTP incompleta. Los correos se simularán en consola.');
      return;
    }

    // Clean any spaces from Google App Passwords (e.g. "ymji ynye olpg mfnc" -> "ymjiynyeolpgmfnc")
    const pass = rawPass.replace(/\s+/g, '');
    const port = parseInt(portStr || '587', 10);
    const secure = secureStr === 'true' || port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.logger.log(`📧 Transmisor de correo SMTP inicializado (${host}:${port} - User: ${user})`);
  }

  private getFromHeader(): string {
    return (
      this.configService.get<string>('EMAIL_FROM') ||
      process.env.EMAIL_FROM ||
      'Layerthree <auto.vip6969@gmail.com>'
    );
  }

  private wrapTemplate(contentHtml: string, title: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 800; tracking-style: tight; }
          .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1px; }
          .body { padding: 32px 24px; line-height: 1.6; color: #cbd5e1; }
          .btn { display: inline-block; padding: 12px 28px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; margin-top: 20px; }
          .badge { display: inline-block; background-color: #334155; color: #38bdf8; padding: 10px 20px; border-radius: 8px; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 4px; }
          .footer { background-color: #0f172a; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LAYERTHREE</h1>
            <p>Plataforma de Gestión Corporativa</p>
          </div>
          <div class="body">
            ${contentHtml}
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Layerthree S.A. Todos los derechos reservados.</p>
            <p>Este es un correo automático generado por la plataforma Layerthree.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    const from = this.getFromHeader();
    if (!this.transporter) {
      this.logger.warn(`✉️ [SIMULADOR DE EMAIL] Para: ${to} | Asunto: ${subject}`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: text || html.replace(/<[^>]*>?/gm, ''), // Fallback plain text to avoid SPAM filtering
        html,
      });
      this.logger.log(`✅ Correo enviado exitosamente a ${to} (MessageId: ${info.messageId})`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error al enviar correo SMTP a ${to}:`, error);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetCode: string): Promise<boolean> {
    const subject = 'Código de Verificación - Layerthree';
    const content = `
      <h2 style="color: #ffffff; margin-top: 0;">Recuperación de Contraseña</h2>
      <p>Has solicitado restablecer tu contraseña en la plataforma Layerthree.</p>
      <p>Utiliza el siguiente código de verificación de 6 dígitos:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span class="badge">${resetCode}</span>
      </div>
      <p style="font-size: 13px; color: #94a3b8;">Este código vence en 30 minutos por seguridad. Si no solicitaste este restablecimiento, puedes ignorar este mensaje.</p>
    `;
    const plainText = `LAYERTHREE - Recuperación de Contraseña\n\nHas solicitado restablecer tu contraseña.\nTu código de verificación es: ${resetCode}\n\nEste código vence en 30 minutos.`;
    const html = this.wrapTemplate(content, subject);
    return this.sendMail(to, subject, html, plainText);
  }

  async sendMaterialRequestEmail(to: string, code: string, requesterName: string, projectName: string, itemsCount: number): Promise<boolean> {
    const subject = `Nueva Solicitud de Materiales (${code}) - Layerthree`;
    const content = `
      <h2 style="color: #ffffff; margin-top: 0;">Nueva Solicitud de Materiales</h2>
      <p>El usuario <strong>${requesterName}</strong> ha creado la solicitud de materiales <strong>${code}</strong>.</p>
      <ul style="background: #0f172a; padding: 16px 24px; border-radius: 12px; list-style: none;">
        <li>📁 <strong>Proyecto:</strong> ${projectName}</li>
        <li>🔢 <strong>Cantidad de ítems:</strong> ${itemsCount}</li>
      </ul>
      <p>Por favor ingresa a la plataforma Layerthree para gestionar la entrega y despacho.</p>
    `;
    const plainText = `LAYERTHREE - Nueva Solicitud de Materiales (${code})\n\nEl usuario ${requesterName} solicitó ${itemsCount} ítems para el proyecto "${projectName}".`;
    const html = this.wrapTemplate(content, subject);
    return this.sendMail(to, subject, html, plainText);
  }

  async sendMaterialDispatchedEmail(to: string, code: string, recipientName: string, vanName?: string): Promise<boolean> {
    const subject = `Materiales Despachados (${code}) - Layerthree`;
    const content = `
      <h2 style="color: #ffffff; margin-top: 0;">Materiales Despachados</h2>
      <p>Tu solicitud de materiales <strong>${code}</strong> ha sido despachada por Bodega.</p>
      <ul style="background: #0f172a; padding: 16px 24px; border-radius: 12px; list-style: none;">
        <li>👤 <strong>Recibido por:</strong> ${recipientName}</li>
        ${vanName ? `<li>🛻 <strong>Camioneta Asignada:</strong> ${vanName}</li>` : ''}
      </ul>
      <p>Puedes revisar el comprobante y el detalle de ítems en el módulo de solicitudes de la plataforma Layerthree.</p>
    `;
    const plainText = `LAYERTHREE - Materiales Despachados (${code})\n\nTu solicitud fue despachada y recibida por: ${recipientName}.`;
    const html = this.wrapTemplate(content, subject);
    return this.sendMail(to, subject, html, plainText);
  }

  async sendQuotationRequestEmail(to: string, code: string, title: string, requesterName: string): Promise<boolean> {
    const subject = `Nueva Solicitud de Cotización (${code}) - Layerthree`;
    const content = `
      <h2 style="color: #ffffff; margin-top: 0;">Solicitud de Cotización</h2>
      <p>El usuario <strong>${requesterName}</strong> requiere cotización para: <strong>"${title}"</strong> (${code}).</p>
      <p>Por favor ingresa al módulo de cotizaciones para evaluar costos, proveedor y adjuntar respuesta.</p>
    `;
    const plainText = `LAYERTHREE - Nueva Solicitud de Cotización (${code})\n\n${requesterName} solicitó cotización para "${title}".`;
    const html = this.wrapTemplate(content, subject);
    return this.sendMail(to, subject, html, plainText);
  }

  async sendQuotationResponseEmail(to: string, code: string, title: string, statusText: string): Promise<boolean> {
    const subject = `Respuesta a Cotización (${code}): ${statusText} - Layerthree`;
    const content = `
      <h2 style="color: #ffffff; margin-top: 0;">Actualización de Cotización</h2>
      <p>La solicitud de cotización <strong>${code}</strong> ("${title}") ha sido actualizada al estado <strong>${statusText}</strong> por Bodega.</p>
      <p>Ingresa a la plataforma Layerthree para revisar el costo estimado, comentarios y archivo adjunto.</p>
    `;
    const plainText = `LAYERTHREE - Actualización de Cotización (${code})\n\nLa cotización "${title}" cambió al estado ${statusText}.`;
    const html = this.wrapTemplate(content, subject);
    return this.sendMail(to, subject, html, plainText);
  }

  async sendSupplierQuoteEmail(
    to: string,
    supplierName: string,
    requestCode: string,
    items: { sku: string; productName: string; quantity: number; unitMeasure: string; notes?: string }[],
    senderName: string,
    customNotes?: string,
  ): Promise<boolean> {
    const subject = `Solicitud de Cotización de Materiales - ${requestCode || 'Layerthree'}`;
    const itemsTableRows = items
      .map(
        (i) => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 10px; font-family: monospace; color: #94a3b8;">${i.sku || 'N/A'}</td>
          <td style="padding: 10px; font-weight: 600; color: #ffffff;">${i.productName}</td>
          <td style="padding: 10px; text-align: center; color: #38bdf8; font-weight: 700;">${i.quantity} ${i.unitMeasure || 'UN'}</td>
        </tr>
      `,
      )
      .join('');

    const content = `
      <h2 style="color: #ffffff; margin-top: 0;">Solicitud de Cotización a Proveedor</h2>
      <p>Estimados <strong>${supplierName || 'Proveedor'}</strong>,</p>
      <p>Junto con saludarles cordialmente de parte de <strong>Layerthree S.A.</strong>, solicitamos la cotización de disponibilidad y precios para el siguiente listado de materiales:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 14px;">
        <thead>
          <tr style="background: #1e293b; color: #94a3b8; text-align: left;">
            <th style="padding: 10px;">SKU</th>
            <th style="padding: 10px;">Producto</th>
            <th style="padding: 10px; text-align: center;">Cantidad Requerida</th>
          </tr>
        </thead>
        <tbody>
          ${itemsTableRows}
        </tbody>
      </table>

      ${customNotes ? `<div style="background: #0f172a; padding: 16px; border-left: 4px solid #2563eb; border-radius: 4px; margin-bottom: 20px;"><strong>Observaciones adicionales:</strong><br/>${customNotes}</div>` : ''}

      <p>Agradecemos enviarnos la cotización formal adjunta o detallando precios unitarios, tiempos de entrega y condiciones de pago al correo de contacto.</p>
      <br/>
      <p style="margin-bottom: 4px;">Atentamente,</p>
      <p style="margin-top: 0; font-weight: bold; color: #ffffff;">${senderName || 'Bodega Layerthree'}</p>
      <p style="margin-top: 0; font-size: 13px; color: #94a3b8;">Departamento de Logística y Adquisiciones - Layerthree S.A.</p>
    `;

    const plainItemsText = items
      .map((i) => `- [${i.sku || 'N/A'}] ${i.productName}: ${i.quantity} ${i.unitMeasure || 'UN'}`)
      .join('\n');
    const plainText = `LAYERTHREE S.A. - Solicitud de Cotización\n\nEstimados ${supplierName || 'Proveedor'},\n\nSolicitamos cotización para los siguientes materiales:\n\n${plainItemsText}\n\n${customNotes ? `Notas: ${customNotes}\n\n` : ''}Atentamente,\n${senderName || 'Bodega Layerthree'}\nLayerthree S.A.`;

    const html = this.wrapTemplate(content, subject);
    return this.sendMail(to, subject, html, plainText);
  }
}
