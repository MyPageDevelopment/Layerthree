import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RRule, RRuleSet, rrulestr } from 'rrule';
import { DateTime } from 'luxon';
import { RecurrenceFrequency, Task } from '@prisma/client';

export interface RecurrenceOptions {
  frequency: RecurrenceFrequency;
  interval?: number;
  count?: number;
  until?: Date;
  byWeekDay?: string[]; // ['MO', 'WE', 'FR']
  byMonthDay?: number[]; // [1, 15, 30]
  byMonth?: number[]; // [1, 6, 12]
  exdates?: Date[];
  timezone?: string;
}

export interface EventOccurrenceInstance {
  start: Date;
  end: Date;
  isException: boolean;
  originalTask: Task;
  modifiedData?: any;
}

@Injectable()
export class RecurrenceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera la regla RRULE según RFC 5545
   */
  generateRRule(options: RecurrenceOptions): string {
    const freqMap = {
      DAILY: RRule.DAILY,
      WEEKLY: RRule.WEEKLY,
      MONTHLY: RRule.MONTHLY,
      YEARLY: RRule.YEARLY,
    };

    const weekDayMap: Record<string, any> = {
      MO: RRule.MO,
      TU: RRule.TU,
      WE: RRule.WE,
      TH: RRule.TH,
      FR: RRule.FR,
      SA: RRule.SA,
      SU: RRule.SU,
    };

    const ruleOptions: any = {
      freq: freqMap[options.frequency],
      interval: options.interval || 1,
    };

    if (options.count) {
      ruleOptions.count = options.count;
    }

    if (options.until) {
      ruleOptions.until = options.until;
    }

    if (options.byWeekDay && options.byWeekDay.length > 0) {
      ruleOptions.byweekday = options.byWeekDay.map((day) => weekDayMap[day]);
    }

    if (options.byMonthDay && options.byMonthDay.length > 0) {
      ruleOptions.bymonthday = options.byMonthDay;
    }

    if (options.byMonth && options.byMonth.length > 0) {
      ruleOptions.bymonth = options.byMonth;
    }

    const rule = new RRule(ruleOptions);
    return rule.toString();
  }

  /**
   * Crea una regla de recurrencia para una tarea
   */
  async createRecurrenceRule(
    taskId: string,
    options: RecurrenceOptions,
  ): Promise<any> {
    const rruleString = this.generateRRule(options);

    return this.prisma.recurrenceRule.create({
      data: {
        taskId,
        rrule: rruleString,
        frequency: options.frequency,
        interval: options.interval || 1,
        count: options.count,
        until: options.until,
        byWeekDay: options.byWeekDay ? JSON.stringify(options.byWeekDay) : null,
        byMonthDay: options.byMonthDay
          ? JSON.stringify(options.byMonthDay)
          : null,
        byMonth: options.byMonth ? JSON.stringify(options.byMonth) : null,
        exdates: options.exdates ? JSON.stringify(options.exdates) : null,
        timezone: options.timezone || 'UTC',
      },
    });
  }

  /**
   * Genera todas las ocurrencias de una tarea recurrente en un rango de fechas
   */
  async generateOccurrences(
    taskId: string,
    startRange: Date,
    endRange: Date,
  ): Promise<EventOccurrenceInstance[]> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        recurrenceRule: true,
        exceptions: true,
      },
    });

    if (!task || !task.recurrenceRule) {
      throw new BadRequestException('Task is not recurring');
    }

    const rule = rrulestr(task.recurrenceRule.rrule);
    const occurrences = rule.between(startRange, endRange, true);

    // Obtener excepciones
    const exdates = task.recurrenceRule.exdates
      ? JSON.parse(task.recurrenceRule.exdates)
      : [];

    const result: EventOccurrenceInstance[] = [];

    for (const occurrence of occurrences) {
      // Verificar si esta fecha está en las excepciones
      const isExcluded = exdates.some(
        (exdate: string) =>
          new Date(exdate).getTime() === occurrence.getTime(),
      );

      if (isExcluded) continue;

      // Buscar si hay una modificación para esta ocurrencia
      const exception = task.exceptions.find(
        (ex) =>
          new Date(ex.originalStartDate).getTime() === occurrence.getTime(),
      );

      if (exception && exception.isCancelled) continue;

      const duration = task.dueDate && task.startDate
        ? task.dueDate.getTime() - task.startDate.getTime()
        : 3600000; // 1 hora por defecto

      const instance: EventOccurrenceInstance = {
        start: occurrence,
        end: new Date(occurrence.getTime() + duration),
        isException: !!exception,
        originalTask: task,
        modifiedData: exception
          ? {
              title: exception.title,
              description: exception.description,
              startDate: exception.startDate,
              dueDate: exception.dueDate,
              location: exception.location,
            }
          : null,
      };

      result.push(instance);
    }

    return result;
  }

  /**
   * Crea una excepción para una ocurrencia específica
   */
  async createException(
    taskId: string,
    originalStartDate: Date,
    modifications: Partial<{
      title: string;
      description: string;
      startDate: Date;
      dueDate: Date;
      location: string;
      isCancelled: boolean;
    }>,
  ) {
    return this.prisma.eventOccurrence.create({
      data: {
        taskId,
        originalStartDate,
        originalEndDate: new Date(originalStartDate.getTime() + 3600000), // +1 hora
        ...modifications,
      },
    });
  }

  /**
   * Convierte una fecha a UTC
   */
  toUTC(date: Date, timezone: string): Date {
    const dt = DateTime.fromJSDate(date, { zone: timezone });
    return dt.toUTC().toJSDate();
  }

  /**
   * Convierte una fecha UTC a una zona horaria específica
   */
  fromUTC(date: Date, timezone: string): Date {
    const dt = DateTime.fromJSDate(date, { zone: 'UTC' });
    return dt.setZone(timezone).toJSDate();
  }

  /**
   * Valida que una regla de recurrencia sea correcta
   */
  validateRecurrence(options: RecurrenceOptions): boolean {
    try {
      this.generateRRule(options);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Actualiza la regla de recurrencia
   */
  async updateRecurrenceRule(
    taskId: string,
    options: RecurrenceOptions,
  ): Promise<any> {
    const rruleString = this.generateRRule(options);

    return this.prisma.recurrenceRule.update({
      where: { taskId },
      data: {
        rrule: rruleString,
        frequency: options.frequency,
        interval: options.interval || 1,
        count: options.count,
        until: options.until,
        byWeekDay: options.byWeekDay ? JSON.stringify(options.byWeekDay) : null,
        byMonthDay: options.byMonthDay
          ? JSON.stringify(options.byMonthDay)
          : null,
        byMonth: options.byMonth ? JSON.stringify(options.byMonth) : null,
        exdates: options.exdates ? JSON.stringify(options.exdates) : null,
        timezone: options.timezone || 'UTC',
      },
    });
  }

  /**
   * Elimina la regla de recurrencia
   */
  async deleteRecurrenceRule(taskId: string): Promise<void> {
    await this.prisma.recurrenceRule.delete({
      where: { taskId },
    });
  }
}
