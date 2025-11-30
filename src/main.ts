import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  
   app.useGlobalPipes(
    new ValidationPipe()
  )

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
