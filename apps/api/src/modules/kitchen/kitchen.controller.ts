import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common'
import { KitchenService } from './kitchen.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('kitchen')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('tickets/:branchId')
  getActiveTickets(@Param('branchId') branchId: string) {
    return this.kitchenService.getActiveTickets(branchId)
  }

  @Patch('tickets/:id/status')
  updateTicketStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.kitchenService.updateTicketStatus(id, dto.status)
  }

  @Patch('items/:id/status')
  updateItemStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.kitchenService.updateItemStatus(id, dto.status)
  }
}
