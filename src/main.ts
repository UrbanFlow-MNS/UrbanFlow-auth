import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from './auth.module';

async function bootstrap() {
    const app = await NestFactory.create(AuthModule);

    const config = new DocumentBuilder()
        .setTitle('UrbanFlow-Auth')
        .setDescription(`Documentation de l'authentification de Urban Flow`)
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    app.useGlobalPipes(new ValidationPipe())

    if (process.env.ENABLE_RABBITMQ === 'true') {
        app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.RMQ,
            options: {
                urls: [process.env.RABBIT_MQ ?? ''],
                queue: 'AUTH_QUEUE_IN',
                queueOptions: {
                    durable: false,
                },
            },
        });

        await app.startAllMicroservices()
    }
    
    await app.listen(process.env.API_PORT ?? 3000);
}
bootstrap();
