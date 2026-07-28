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
import { ResourceBookingService } from './resource-booking.service';

@ApiTags('Resource Bookings')
@Controller('api/calendar/resources')
export class ResourceBookingController {
  constructor(private readonly bookingService: ResourceBookingService) {}

  @Get(':resourceId/availability')
  @ApiOperation({ summary: 'Check if a resource is available' })
  async checkAvailability(
    @Param('resourceId') resourceId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingService.checkResourceAvailability(
      resourceId,
      new Date(start),
      new Date(end),
    );
  }

  @Post(':resourceId/bookings')
  @ApiOperation({ summary: 'Book a resource' })
  @ApiResponse({ status: 201, description: 'Resource booked successfully' })
  async bookResource(
    @Param('resourceId') resourceId: string,
    @Body() data: {
      taskId: string;
      userId: string;
      startTime: string;
      endTime: string;
      purpose?: string;
      autoConfirm?: boolean;
    },
  ) {
    return this.bookingService.bookResource(
      resourceId,
      data.taskId,
      data.userId,
      new Date(data.startTime),
      new Date(data.endTime),
      data.purpose,
      data.autoConfirm,
    );
  }

  @Get(':resourceId/calendar')
  @ApiOperation({ summary: 'Get resource calendar (all bookings)' })
  async getResourceCalendar(
    @Param('resourceId') resourceId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingService.getResourceCalendar(
      resourceId,
      new Date(start),
      new Date(end),
    );
  }

  @Put('bookings/:bookingId/confirm')
  @ApiOperation({ summary: 'Confirm a booking' })
  async confirmBooking(
    @Param('bookingId') bookingId: string,
    @Body() data: { userId: string },
  ) {
    await this.bookingService.confirmBooking(bookingId, data.userId);
    return { message: 'Booking confirmed' };
  }

  @Put('bookings/:bookingId/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancelBooking(
    @Param('bookingId') bookingId: string,
    @Body() data: { userId: string },
  ) {
    await this.bookingService.cancelBooking(bookingId, data.userId);
    return { message: 'Booking cancelled' };
  }

  @Put('bookings/:bookingId')
  @ApiOperation({ summary: 'Update a booking' })
  async updateBooking(
    @Param('bookingId') bookingId: string,
    @Body() data: {
      userId: string;
      startTime?: string;
      endTime?: string;
      purpose?: string;
    },
  ) {
    return this.bookingService.updateBooking(bookingId, data.userId, {
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      purpose: data.purpose,
    });
  }

  @Get('bookings/users/:userId')
  @ApiOperation({ summary: 'Get all bookings for a user' })
  async getUserBookings(
    @Param('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingService.getUserBookings(
      userId,
      new Date(start),
      new Date(end),
    );
  }

  @Get('available')
  @ApiOperation({ summary: 'Find available resources of a specific type' })
  async findAvailableResources(
    @Query('type') type: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.bookingService.findAvailableResources(
      type,
      new Date(start),
      new Date(end),
    );
  }
}
