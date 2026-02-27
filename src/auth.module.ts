import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './controllers/auth.controller';
import { PrometheusController } from './controllers/prometheus.controller';
import { AppConstants } from "./core/contants";
import { AuthService } from './services/auth.service';
import { LogsService } from './services/log.service';
import { PrometheusService } from './services/prometheus.service';
import { AuthUtils } from './utils/auth.utils';

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
    controllers: [AuthController, PrometheusController],
    providers: [
        LogsService,
        AuthUtils,
        { provide: AppConstants.IAUTH_SERVICE, useClass: AuthService },
        PrometheusService,
        { provide: 'IPrometheusService', useClass: PrometheusService },
    ],
})
export class AuthModule { }
