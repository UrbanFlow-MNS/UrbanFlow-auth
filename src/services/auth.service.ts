import { UserSignInBody, UserSignUpBody } from "@bato-urbanflow/urbanflow-models";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ClientGrpc, ClientProxy, RpcException } from "@nestjs/microservices";
import { Metadata } from "@grpc/grpc-js";
import { IAuthService } from "../interfaces/auth-service.interface";
import { SendEmailDto } from "../objects/send-email.dto";
import { LogsService } from "../logs-service/log.service";
import { firstValueFrom, Observable } from "rxjs";
import * as argon2 from "argon2";
import { UserDtoGrpc, UserRoleType, UserServiceClient, USER_SERVICE_NAME } from "../../../proto/generated/typescript/user";

@Injectable()
export class AuthService implements IAuthService {
    private userService!: UserServiceClient;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly logsService: LogsService,
        @Inject("NOTIFICATIONS_SERVICE") private readonly notificationClient: ClientProxy,
        @Inject("USER_PACKAGE") private readonly userClient: ClientGrpc,
    ) { }

    onModuleInit() {
        this.userService = this.userClient.getService<UserServiceClient>(USER_SERVICE_NAME);
    }

    private userMeta(): Metadata {
        const meta = new Metadata();
        meta.add("x-internal-secret", process.env.USER_INTERNAL_SECRET ?? "");
        return meta;
    }

    private callUser<T>(method: keyof UserServiceClient, request: unknown): Observable<T> {
        const fn = this.userService[method] as unknown as (req: unknown, meta: Metadata) => Observable<T>;
        return fn.call(this.userService, request, this.userMeta());
    }

    async signUp(body: UserSignUpBody): Promise<UserDtoGrpc> {
        const existing = await firstValueFrom(
            this.callUser<{ user?: UserDtoGrpc }>("findOneByEmail", { email: body.email })
        );
        if (existing?.user) {
            throw new RpcException({ statusCode: 400, message: "Fail to create" });
        }

        const created = await firstValueFrom(
            this.callUser<UserDtoGrpc>("createUser", {
                firstName: body.firstName,
                lastName: body.lastName,
                email: body.email,
                password: body.password,
                role: body.role as unknown as UserRoleType,
                agencyId: body.agencyId,
            }),
        );
        if (!created?.id) {
            throw new RpcException({ statusCode: 400, message: "Fail to create" });
        }

        const result = await this.userWithTokens(created.id, created.role);
        this.logsService.sendUserConnectedEvent(result.email ?? "");
        return result;
    }

    async signIn(body: UserSignInBody): Promise<UserDtoGrpc> {
        const res = await firstValueFrom(
            this.callUser<{ user?: UserDtoGrpc }>("checkUserCredentials", { email: body.email, password: body.password })
        );
        if (!res?.user) {
            throw new RpcException({ statusCode: 401, message: "Invalid credentials" });
        }

        const result = await this.userWithTokens(res.user.id, res.user.role);
        this.logsService.sendUserConnectedEvent(result.email ?? "");
        return result;
    }

    async refreshToken(token: string): Promise<UserDtoGrpc> {
        try {
            const decoded = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
                algorithms: ["HS256"],
            });
            if (!decoded?.sub) throw new Error("Invalid token");
            if (decoded.typ !== "refresh") throw new Error("Wrong token type");

            const res = await firstValueFrom(
                this.callUser<{ user?: UserDtoGrpc }>("findOneById", { id: decoded.sub })
            );
            if (!res?.user || !res.user.refreshToken) {
                throw new Error("Access denied");
            }

            const valid = await argon2.verify(res.user.refreshToken, token);
            if (!valid) {
                throw new Error("Access denied");
            }

            return await this.userWithTokens(res.user.id, res.user.role);
        } catch {
            throw new RpcException({ statusCode: 403, message: "Invalid refresh token" });
        }
    }

    private async userWithTokens(userId: number, role: string): Promise<UserDtoGrpc> {
        const accessToken = await this.jwtService.signAsync(
            { sub: userId, role, typ: "access" },
            {
                secret: this.configService.get<string>("JWT_SECRET"),
                algorithm: "HS256",
                expiresIn: "1h",
            },
        );
        const refreshToken = await this.jwtService.signAsync(
            { sub: userId, role, typ: "refresh" },
            {
                secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
                algorithm: "HS256",
                expiresIn: "30d",
            },
        );
        const hashedRefreshToken = await this.hashRefreshToken(refreshToken);

        const updated = await firstValueFrom(
            this.callUser<UserDtoGrpc>("setRefreshToken", { userId, refreshToken: hashedRefreshToken })
        );

        return { ...updated, accessToken, refreshToken };
    }

    private hashRefreshToken(token: string): Promise<string> {
        return argon2.hash(token, {
            type: argon2.argon2id,
            memoryCost: 19456,
            timeCost: 2,
            parallelism: 1,
        });
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const resetToken = await this.jwtService.signAsync(
            { email },
            { expiresIn: "15m" },
        );
        const resetLink = `https://auth.urbanflow.lazyy.fr/reset-password?token=${resetToken}`;

        const emailContent = `Bonjour,

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte.
Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe.

${resetLink}

Ce lien expirera dans 15 minutes.

Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.`;

        const body = new SendEmailDto();
        body.email = email;
        body.object = "Réinitialisation de votre mot de passe";
        body.body = emailContent;

        this.notificationClient.emit("notifications.sendEmail", body);
        return { message: "If this email exists, a reset link has been sent" };
    }
}
