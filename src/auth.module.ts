import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './objects/entities/user.entity';

@Module({
    imports: [
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
    ],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule { }
