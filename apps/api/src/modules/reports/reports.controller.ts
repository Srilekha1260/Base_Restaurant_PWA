import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales/:branchId')
  getSales(
    @Param('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getSalesSummary(branchId, new Date(from), new Date(to))
  }

  @Get('tables/:branchId')
  getTableReport(
    @Param('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getTableReport(branchId, new Date(from), new Date(to))
  }

  @Get('cancelled/:branchId')
  getCancelledItems(
    @Param('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getCancelledItems(branchId, new Date(from), new Date(to))
  }
}
