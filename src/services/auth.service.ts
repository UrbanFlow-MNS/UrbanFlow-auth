import { UserSignInBody, UserSignUpBody } from "@bato-urbanflow/urbanflow-models";
import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ClientGrpc, ClientProxy, RpcException } from "@nestjs/microservices";
import { IAuthService } from "../interfaces/auth-service.interface";
import { SendEmailDto } from "../objects/send-email.dto";
import { LogsService } from "../logs/log.service";
import { firstValueFrom } from "rxjs";
import { UserDtoGrpc, UserRoleType, UserServiceClient, USER_SERVICE_NAME } from "../../../proto/generated/typescript/user";

@Injectable()
export class AuthService implements IAuthService {
    private userService!: UserServiceClient;

    constructor(
        private readonly jwtService: JwtService,
        private readonly logsService: LogsService,
        @Inject("NOTIFICATIONS_SERVICE") private readonly notificationClient: ClientProxy,
        @Inject("USER_PACKAGE") private readonly userClient: ClientGrpc,
    ) { }

    onModuleInit() {
        this.userService = this.userClient.getService<UserServiceClient>(USER_SERVICE_NAME);
    }

    async signUp(body: UserSignUpBody): Promise<UserDtoGrpc> {
        const existing = await firstValueFrom(
            this.userService.findOneByEmail({ email: body.email })
        );
        if (existing?.user) {
            throw new RpcException({ statusCode: 400, message: "Fail to create" });
        }

        const created = await firstValueFrom(
            this.userService.createUser({
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
            this.userService.checkUserCredentials({ email: body.email, password: body.password })
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
            const decoded = await this.jwtService.verifyAsync(token);
            if (!decoded?.sub) throw new Error("Invalid token");

            const res = await firstValueFrom(
                this.userService.findOneById({ id: decoded.sub })
            );
            if (!res?.user || res.user.refreshToken !== token) {
                throw new Error("Access denied");
            }

            return await this.userWithTokens(res.user.id, res.user.role);
        } catch {
            throw new RpcException({ statusCode: 403, message: "Invalid refresh token" });
        }
    }

    private async userWithTokens(userId: number, role: string): Promise<UserDtoGrpc> {
        const payload = { sub: userId, role };
        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: "1h" });
        const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: "30d" });

        const updated = await firstValueFrom(
            this.userService.setRefreshToken({ userId, refreshToken })
        );

        return { ...updated, accessToken };
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
