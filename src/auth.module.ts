import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { LogsService } from './services/log.service';
import { AuthUtils } from './utils/auth.utils';
import {AppConstants} from "./core/contants";

@Module({
    imports: [
        JwtModule.register({
            global: true,
            secret: process.env.JWT_SECRET
        }),
        ClientsModule.register([
            {
                name: 'LOGS_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBIT_MQ ?? ''],
                    queue: 'LOGS_QUEUE',
                    queueOptions: { durable: false },
                },
            },
            {
                name: 'NOTIFICATIONS_SERVICE',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBIT_MQ ?? ''],
                    queue: 'NOTIFICATIONS_QUEUE',
                    queueOptions: { durable: false },
                },
            },
            {
                name: 'USER_SERVICE',
                transport: Transport.TCP,
                options: {
                    host: process.env.USER_SERVICE_HOST || '',
                    port: Number.parseInt(process.env.USER_SERVICE_TCP_PORT || ''),
                },
            }
        ])
    ],
    controllers: [AuthController],
    providers: [
        LogsService,
        AuthUtils,
        { provide: AppConstants.IAUTH_SERVICE, useClass: AuthService }
    ],
})
export class AuthModule { }
