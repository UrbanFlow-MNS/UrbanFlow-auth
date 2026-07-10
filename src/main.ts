import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from './auth.module';

async function bootstrap() {
    const authInternalSecret = process.env.AUTH_INTERNAL_SECRET;
    if (!authInternalSecret) {
        throw new Error("AUTH_INTERNAL_SECRET is not defined.");
    }

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
                queue: 'AUTH_QUEUE',
                queueOptions: {
                    durable: false,
                },
            },
        });

        // For gateway
        app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.TCP,
            options: {
                host: '0.0.0.0',
                port: Number(process.env.TCP_PORT) || 6001
            },
        });

        await app.startAllMicroservices()
    }

    await app.listen(process.env.API_PORT ?? 3000);
}
bootstrap();
