import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { TablesService } from './tables.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get('branch/:branchId/status')
  getStatus(@Param('branchId') branchId: string) {
    return this.tablesService.getTableStatusByBranch(branchId)
  }

  @Post('sections')
  createSection(@Body() dto: { branchId: string; name: string }) {
    return this.tablesService.createSection(dto.branchId, dto.name)
  }

  @Post()
  createTable(@Body() dto: { sectionId: string; name: string; capacity?: number }) {
    return this.tablesService.createTable(dto.sectionId, dto.name, dto.capacity)
  }

  @Patch(':id')
  updateTable(@Param('id') id: string, @Body() dto: any) {
    return this.tablesService.updateTable(id, dto)
  }
}
