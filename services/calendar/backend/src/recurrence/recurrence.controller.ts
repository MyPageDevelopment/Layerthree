import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecurrenceService, RecurrenceOptions } from './recurrence.service';

@ApiTags('Recurrence')
@Controller('api/calendar/recurrence')
export class RecurrenceController {
  constructor(private readonly recurrenceService: RecurrenceService) {}

  @Post(':taskId')
  @ApiOperation({ summary: 'Create recurrence rule for a task' })
  @ApiResponse({ status: 201, description: 'Recurrence rule created' })
  async createRecurrence(
    @Param('taskId') taskId: string,
    @Body() options: RecurrenceOptions,
  ) {
    return this.recurrenceService.createRecurrenceRule(taskId, options);
  }

  @Get(':taskId/occurrences')
  @ApiOperation({ summary: 'Get all occurrences of a recurring task' })
  async getOccurrences(
    @Param('taskId') taskId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.recurrenceService.generateOccurrences(taskId, startDate, endDate);
  }

  @Post(':taskId/exceptions')
  @ApiOperation({ summary: 'Create exception for specific occurrence' })
  async createException(
    @Param('taskId') taskId: string,
    @Body() data: {
      originalStartDate: string;
      title?: string;
      description?: string;
      startDate?: string;
      dueDate?: string;
      location?: string;
      isCancelled?: boolean;
    },
  ) {
    return this.recurrenceService.createException(
      taskId,
      new Date(data.originalStartDate),
      {
        title: data.title,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        location: data.location,
        isCancelled: data.isCancelled,
      },
    );
  }

  @Put(':taskId')
  @ApiOperation({ summary: 'Update recurrence rule' })
  async updateRecurrence(
    @Param('taskId') taskId: string,
    @Body() options: RecurrenceOptions,
  ) {
    return this.recurrenceService.updateRecurrenceRule(taskId, options);
  }

  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete recurrence rule' })
  async deleteRecurrence(@Param('taskId') taskId: string) {
    await this.recurrenceService.deleteRecurrenceRule(taskId);
  }
}
