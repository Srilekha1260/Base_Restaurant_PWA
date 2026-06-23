import { Module } from '@nestjs/common'
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { BranchesModule } from './modules/branches/branches.module'
import { UsersModule } from './modules/users/users.module'
import { MenuModule } from './modules/menu/menu.module'
import { OrdersModule } from './modules/orders/orders.module'
import { KitchenModule } from './modules/kitchen/kitchen.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { ReportsModule } from './modules/reports/reports.module'
import { TablesModule } from './modules/tables/tables.module'
import { SocketsModule } from './modules/sockets/sockets.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TenantsModule,
    BranchesModule,
    UsersModule,
    MenuModule,
    OrdersModule,
    KitchenModule,
    PaymentsModule,
    ReportsModule,
    TablesModule,
    SocketsModule,
  ],
})
export class AppModule {}
