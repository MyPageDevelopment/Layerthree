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
import { AttendanceService } from './attendance.service';
import { AttendeeStatus } from '@prisma/client';

@ApiTags('Attendance')
@Controller('api/calendar/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('tasks/:taskId/invitations')
  @ApiOperation({ summary: 'Create invitations for an event' })
  @ApiResponse({ status: 201, description: 'Invitations created' })
  async createInvitations(
    @Param('taskId') taskId: string,
    @Body() data: { userIds: string[]; organizerId: string },
  ) {
    return this.attendanceService.createInvitations(
      taskId,
      data.userIds,
      data.organizerId,
    );
  }

  @Put(':attendanceId/respond')
  @ApiOperation({ summary: 'Respond to an invitation (Accept/Decline/Tentative)' })
  async respondToInvitation(
    @Param('attendanceId') attendanceId: string,
    @Body() data: { userId: string; status: AttendeeStatus; comment?: string },
  ) {
    return this.attendanceService.respondToInvitation(
      attendanceId,
      data.userId,
      data.status,
      data.comment,
    );
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get attendance for an event' })
  async getEventAttendance(@Param('taskId') taskId: string) {
    return this.attendanceService.getEventAttendance(taskId);
  }

  @Get('tasks/:taskId/stats')
  @ApiOperation({ summary: 'Get attendance statistics' })
  async getEventStats(@Param('taskId') taskId: string) {
    return this.attendanceService.getEventStats(taskId);
  }

  @Get('users/:userId/pending')
  @ApiOperation({ summary: 'Get pending invitations for a user' })
  async getPendingInvitations(@Param('userId') userId: string) {
    return this.attendanceService.getUserPendingInvitations(userId);
  }

  @Put(':attendanceId')
  @ApiOperation({ summary: 'Update invitation (organizer only)' })
  async updateInvitation(
    @Param('attendanceId') attendanceId: string,
    @Body() data: { organizerId: string; isRequired?: boolean; status?: AttendeeStatus },
  ) {
    await this.attendanceService.updateInvitation(
      attendanceId,
      data.organizerId,
      { isRequired: data.isRequired, status: data.status },
    );
    return { message: 'Invitation updated' };
  }

  @Delete(':attendanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove invitation' })
  async removeInvitation(
    @Param('attendanceId') attendanceId: string,
    @Query('organizerId') organizerId: string,
  ) {
    await this.attendanceService.removeInvitation(attendanceId, organizerId);
  }

  @Post('tasks/:taskId/notify')
  @ApiOperation({ summary: 'Notify all attendees' })
  async notifyAttendees(
    @Param('taskId') taskId: string,
    @Body() data: { message: string },
  ) {
    await this.attendanceService.notifyAttendees(taskId, data.message);
    return { message: 'Attendees notified' };
  }
}
