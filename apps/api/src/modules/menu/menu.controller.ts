import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common'
import { MenuService } from './menu.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  // Public endpoint — no auth required for browsing the menu
  @Get('tenant/:tenantId')
  getMenu(@Param('tenantId') tenantId: string) {
    return this.menuService.getMenuByTenant(tenantId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('categories')
  createCategory(@Req() req: any, @Body() dto: any) {
    return this.menuService.createCategory(req.user.tenantId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: any) {
    return this.menuService.updateCategory(id, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.menuService.deleteCategory(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('items')
  createItem(@Req() req: any, @Body() dto: any) {
    return this.menuService.createMenuItem(req.user.tenantId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: any) {
    return this.menuService.updateMenuItem(id, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.menuService.deleteMenuItem(id)
  }
}
