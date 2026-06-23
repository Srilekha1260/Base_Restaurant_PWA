import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common'
import { BranchesService } from './branches.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  getMyBranches(@Req() req: any) {
    return this.branchesService.getByTenant(req.user.tenantId)
  }
}
