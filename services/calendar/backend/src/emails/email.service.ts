import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { getSecret } from '../common/utils/secrets.util';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface TaskNotificationData {
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  milestoneName?: string;
  priority: string;
  dueDate?: Date;
  assignedBy: string;
  recipientEmail: string;
  recipientName: string;
  updateToken?: string; // Token para actualización por correo
  shiftTypeName?: string; // Nombre del tipo de jornada
  shiftTypeColor?: string; // Color del tipo de jornada
}

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);
  private emailConfigured = false;

  constructor() {
    // El transporter se configurará dinámicamente cuando se reciban las credenciales
    this.logger.log('EmailService initialized - awaiting configuration');
  }

  /**
   * Configura el transporter de nodemailer con las credenciales proporcionadas
   */
  configureEmail(config: EmailConfig) {
    try {
      // El password ya viene resuelto desde main.ts (ya sea de secret o env var)
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.auth.user,
          pass: config.auth.pass, // Ya viene procesado desde main.ts
        },
      });
      this.emailConfigured = true;
      this.logger.log('Email transporter configured successfully');
    } catch (error) {
      this.logger.error('Error configuring email transporter', error);
      throw error;
    }
  }

  /**
   * Verifica si el servicio de email está configurado
   */
  isConfigured(): boolean {
    return this.emailConfigured;
  }

  /**
   * Envía notificación de asignación de tarea
   */
  async sendTaskAssignmentNotification(data: TaskNotificationData): Promise<boolean> {
    if (!this.emailConfigured) {
      this.logger.warn('Email service not configured - skipping notification');
      return false;
    }

    try {
      const htmlContent = this.generateTaskAssignmentHTML(data);

      await this.transporter.sendMail({
        from: `"Layerthree - Gestión de Proyectos" <${process.env.EMAIL_FROM || 'noreply@layerthree.cl'}>`,
        to: data.recipientEmail,
        subject: `📋 Nueva Tarea Asignada: ${data.taskTitle}`,
        html: htmlContent,
      });

      this.logger.log(`Task assignment email sent to ${data.recipientEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email to ${data.recipientEmail}`, error);
      return false;
    }
  }

  /**
   * Genera el HTML para el correo de asignación de tarea
   */
  private generateTaskAssignmentHTML(data: TaskNotificationData): string {
    const priorityColors = {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
    };

    const priorityLabels = {
      LOW: 'Baja',
      MEDIUM: 'Media',
      HIGH: 'Alta',
    };

    const priorityColor = priorityColors[data.priority] || '#6b7280';
    const priorityLabel = priorityLabels[data.priority] || data.priority;

    const dueDateFormatted = data.dueDate
      ? new Date(data.dueDate).toLocaleDateString('es-CL', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Sin fecha límite';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Tarea Asignada</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                📋 Nueva Tarea Asignada
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151;">
                Hola <strong>${data.recipientName}</strong>,
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151;">
                Se te ha asignado una nueva tarea en el sistema de gestión de proyectos de <strong>Layerthree</strong>:
              </p>

              <!-- Task Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
                
                <!-- Task Title -->
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="margin: 0; font-size: 20px; color: #1f2937;">
                      ${data.taskTitle}
                    </h2>
                  </td>
                </tr>

                <!-- Task Description -->
                ${data.taskDescription ? `
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                      Descripción
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                      ${data.taskDescription}
                    </p>
                  </td>
                </tr>
                ` : ''}

                <!-- Project Info -->
                <tr>
                  <td style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50%; padding-right: 10px;">
                          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                            Proyecto
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #374151; font-weight: 500;">
                            ${data.projectName}
                          </p>
                        </td>
                        ${data.milestoneName ? `
                        <td style="width: 50%; padding-left: 10px;">
                          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                            Hito
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #374151; font-weight: 500;">
                            ${data.milestoneName}
                          </p>
                        </td>
                        ` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Priority & Due Date -->
                <tr>
                  <td style="padding: 20px; ${data.shiftTypeName ? 'border-bottom: 1px solid #e5e7eb;' : ''}">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 50%; padding-right: 10px;">
                          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                            Prioridad
                          </p>
                          <p style="margin: 0;">
                            <span style="display: inline-block; padding: 4px 12px; background-color: ${priorityColor}; color: #ffffff; border-radius: 12px; font-size: 12px; font-weight: 600;">
                              ${priorityLabel}
                            </span>
                          </p>
                        </td>
                        <td style="width: 50%; padding-left: 10px;">
                          <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                            Fecha Límite
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #374151; font-weight: 500;">
                            ${dueDateFormatted}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${data.shiftTypeName ? `
                <!-- Shift Type -->
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">
                      Tipo de Jornada
                    </p>
                    <p style="margin: 0;">
                      <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; font-weight: 500;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${data.shiftTypeColor || '#6b7280'};"></span>
                        <span style="color: #374151;">${data.shiftTypeName}</span>
                      </span>
                    </p>
                  </td>
                </tr>
                ` : ''}

              </table>

              <!-- Assigned By -->
              <p style="margin: 0 0 30px 0; font-size: 14px; color: #6b7280;">
                Asignado por: <strong style="color: #374151;">${data.assignedBy}</strong>
              </p>

              ${data.updateToken ? `
              <!-- Quick Actions with Token -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 16px 0; font-size: 16px; color: #ffffff; font-weight: 600; text-align: center;">
                  ⚡ Acciones Rápidas
                </p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #e0e7ff; text-align: center;">
                  Actualiza el estado de esta tarea con un solo clic, sin necesidad de iniciar sesión
                </p>
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 5px;">
                      <a href="${process.env.APP_URL || 'http://localhost'}/task-update/${data.updateToken}/IN_PROGRESS" style="display: block; padding: 12px 20px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
                        🚀 Marcar en Progreso
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px;">
                      <a href="${process.env.APP_URL || 'http://localhost'}/task-update/${data.updateToken}/COMPLETED" style="display: block; padding: 12px 20px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
                        ✅ Marcar Completada
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 5px;">
                      <a href="${process.env.APP_URL || 'http://localhost'}/task-update/${data.updateToken}/BLOCKED" style="display: block; padding: 12px 20px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center;">
                        ⚠️ Reportar Problema
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 16px 0 0 0; font-size: 11px; color: #e0e7ff; text-align: center;">
                  Este enlace expira en 30 días
                </p>
              </div>
              ` : ''}

              <!-- Call to Action -->
              <table role="presentation" style="width: 100%; margin-bottom: 20px;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.APP_URL || 'http://localhost'}/projects" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      📊 Ver Panel de Proyectos
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer Message -->
              <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6;">
                Accede al sistema para gestionar esta tarea y colaborar con tu equipo.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Este es un correo automático de <strong>Layerthree - Gestión de Proyectos</strong>.<br>
                Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Verifica la conexión con el servidor de correo
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.emailConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Email connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email connection verification failed', error);
      return false;
    }
  }
}
