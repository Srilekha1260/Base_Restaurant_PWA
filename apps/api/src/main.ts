import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  // rawBody is required to verify Stripe webhook signatures.
  const app = await NestFactory.create(AppModule, { rawBody: true })

  const allowedOrigins: string[] = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ]
  if (process.env.WEB_URL) allowedOrigins.push(process.env.WEB_URL)
  if (process.env.STAFF_URL) allowedOrigins.push(process.env.STAFF_URL)
  if (process.env.KITCHEN_URL) allowedOrigins.push(process.env.KITCHEN_URL)
  if (process.env.ADMIN_URL) allowedOrigins.push(process.env.ADMIN_URL)

  app.enableCors({ origin: allowedOrigins, credentials: true })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api/v1')

  const port = process.env.PORT || 4000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api/v1`)
}

bootstrap()
