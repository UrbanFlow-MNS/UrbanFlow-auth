import { UserDto, UserSignInBody } from '@bato-urbanflow/urbanflow-models';
import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { IAuthService} from '../interfaces/auth-service.interface';
import { SendEmailDto } from '../objects/send-email.dto';
import { AuthUtils } from '../utils/auth.utils';
import { LogsService } from "./log.service";

@Injectable()
export class AuthService implements IAuthService {

    constructor(
        private readonly jwtService: JwtService,
        private readonly logsService: LogsService,
        private readonly authUtils: AuthUtils,
        @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
        @Inject('NOTIFICATIONS_SERVICE') private readonly notificationClient: ClientProxy
    ) { }

    async signUp(body: UserSignInBody): Promise<UserDto> {
        const user: UserDto = await this.authUtils.fetchOneUserByEmail(body.email)

        if (user) {
            throw new RpcException({ statusCode: 400, message: 'User already exist' })
        }

        const createdUser: UserDto = await this.authUtils.createUser(body)

        if (!createdUser) {
            throw new RpcException({ statusCode: 400, message: 'Fail to create' })
        }

        const userWithTokens = await this.authUtils.setTokens(createdUser)
        this.logsService.sendUserConnectedEvent(createdUser.email ?? "")
        return userWithTokens
    }

    async signIn(body: UserSignInBody) {
        const user: UserDto = await this.authUtils.fetchOneUserByEmail(body.email)

        if (!user) {
            throw new RpcException({ statusCode: 404, message: 'User not found' })
        }

        const isCredentialsValid = await this.authUtils.fetchCheckCredentials(body.email, body.password)

        if (!isCredentialsValid) {
            throw new RpcException({ statusCode: 401, message: 'Invalid credentials' })
        }

        const userWithTokens = await this.authUtils.setTokens(user)
        this.logsService.sendUserConnectedEvent(user.email ?? "")
        return userWithTokens
    }

    async refreshToken(token: string) {
        try {
            const decoded = await this.jwtService.verifyAsync(token);

            if (!decoded?.sub) {
                throw new Error("Invalid token");
            }

            const user = await this.authUtils.fetchOneUserById(decoded.sub);

            if (!user || user.refreshToken !== token) {
                throw new Error("Access denied");
            }

            return await this.authUtils.setTokens(user);
        } catch {
            throw new RpcException({ statusCode: 403, message: 'Invalid refresh token' });
        }
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const resetToken = await this.jwtService.signAsync({ email }, { expiresIn: "15m" })
        const resetLink = `https://urbanflow.lazyy.fr/reset-password?token=${resetToken}`;

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
        return { message: 'If this email exists, a reset link has been sent' };
    }

}