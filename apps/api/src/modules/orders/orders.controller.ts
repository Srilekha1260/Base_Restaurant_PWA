import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  createOrder(@Req() req: any, @Body() dto: any) {
    return this.ordersService.createOrder(req.user.id, dto)
  }

  @Get('branch/:branchId')
  getOrdersByBranch(@Param('branchId') branchId: string, @Query() filters: any) {
    return this.ordersService.getOrdersByBranch(branchId, filters)
  }

  @Get('table/:tableId/active')
  getActiveOrderForTable(@Param('tableId') tableId: string) {
    return this.ordersService.getActiveOrderForTable(tableId)
  }

  @Get(':id')
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrderById(id)
  }

  @Post(':id/items')
  addItems(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.ordersService.addItemsToOrder(id, req.user.id, dto.items)
  }

  @Patch(':id/items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Req() req: any, @Body() dto: any) {
    return this.ordersService.updateOrderItem(itemId, req.user.id, dto)
  }

  @Delete(':id')
  cancelOrder(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.cancelOrder(id, req.user.id)
  }
}
