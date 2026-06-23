import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Req } from '@nestjs/common'
import { UsersService } from './users.service'
import { AuthService } from '../auth/auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService,
  ) {}

  @Get()
  getUsers(@Req() req: any) {
    return this.usersService.getByTenant(req.user.tenantId)
  }

  @Post()
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  createUser(@Req() req: any, @Body() dto: any) {
    return this.authService.createUser({ ...dto, tenantId: req.user.tenantId })
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateUser(id, dto)
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivate(id)
  }
}
