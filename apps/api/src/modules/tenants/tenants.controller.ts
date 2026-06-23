import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { TenantsService } from './tenants.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tenantsService.findBySlug(slug)
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.tenantsService.findAll()
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id)
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: any) {
    return this.tenantsService.create(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.tenantsService.update(id, dto)
  }
}
