import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { AuthController } from "./controllers/auth.controller";
import { PrometheusController } from "./controllers/prometheus.controller";
import { AppConstants } from "./core/contants";
import { AuthService } from "./services/auth.service";
import { PrometheusService } from "./services/prometheus.service";
import { UserGrpcModule } from "../../shared/nestjs/user/user-grpc.module";
import { LogsModule } from "./logs-service/log.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.registerAsync({
            global: true,
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => {
                const secret = config.get<string>("JWT_SECRET");
                if (!secret) {
                    throw new Error("JWT_SECRET is not defined");
                }
                return {
                    secret,
                    signOptions: { algorithm: "HS256" },
                };
            },
            inject: [ConfigService],
        }),
        LogsModule,
        NotificationsModule,
        UserGrpcModule
    ],
    controllers: [AuthController, PrometheusController],
    providers: [
        { provide: AppConstants.IAUTH_SERVICE, useClass: AuthService },
        PrometheusService,
        { provide: "IPrometheusService", useClass: PrometheusService },
    ],
})
export class AuthModule { }
