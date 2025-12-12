import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './objects/entities/user.entity';
import { LogsService } from './services/log.service';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.POSTGRES_HOST,
            port: Number(process.env.POSTGRES_PORT),
            username: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
            entities: [
                UserEntity
            ],
            synchronize: Boolean(process.env.POSTGRES_SYNCHRONISE),
        }),
        TypeOrmModule.forFeature([UserEntity]),

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
                    queue: 'LOGS_QUEUE_IN',
                    queueOptions: { durable: false },
                },
            }
        ])
    ],
    controllers: [AuthController],
    providers: [AuthService, LogsService],
})
export class AuthModule { }
