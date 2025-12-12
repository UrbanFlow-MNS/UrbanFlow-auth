import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from 'argon2';
import { Repository } from "typeorm";
import { LogBody } from "./objects/dtos/log.body";
import { UserSignInBody } from "./objects/dtos/user-signin.body";
import { UserWithTokenDto } from "./objects/dtos/user-with-token.dto";
import { UserBody } from "./objects/dtos/user.body";
import { UserEntity } from "./objects/entities/user.entity";
import { RMQEventType } from "./objects/enums/rmq-event.enum";
import { LogsService } from "./services/log.service";

@Injectable()
export class AuthService {

    constructor(
        private jwtService: JwtService,
        private logsService: LogsService,
        @InjectRepository(UserEntity) private repository: Repository<UserEntity>,
        @Inject('LOGS_SERVICE') private readonly client: ClientProxy,
    ) { 
        this.logsService = new LogsService(client)
    }

    async signIn(body: UserSignInBody) {
        const user = await this.repository.findOne({ where: { email: body.email } });
        if (!user) {
            const logUserNotFound = new LogBody("404", `User not found for ${body.email}`)
            this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logUserNotFound)
            throw new NotFoundException('User not found');
        }

        const isMatch = await argon2.verify(user.password, body.password);

        if (!isMatch) {
            const logInvalidCredentials = new LogBody("401", `Wrong credentials for ${body.email}`)
            this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logInvalidCredentials)
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokenAndRefreshToken(user);

        await this.repository.update(user.id, {
            refreshToken: await argon2.hash(tokens.refreshToken),
        });

        const logSuccessSignIn = new LogBody("200", `${user.firstName} ${user.lastName} connected at ${new Date()}`)
        this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logSuccessSignIn)

        return this.generateUserWithToken(user, tokens);
    }

    async signUp(body: UserBody) {
        const existing = await this.repository.findOne({ where: { email: body.email } });
        if (existing) {
            const logEmailUsed = new LogBody("400", `Email already used -> ${body.email}`)
            this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logEmailUsed)
            throw new BadRequestException("Email already used");
        }

        const hashedPassword = await argon2.hash(body.password);

        const userCreated = this.repository.create({
            ...body,
            password: hashedPassword,
        });

        const userSaved = await this.repository.save(userCreated);
        const tokens = await this.generateTokenAndRefreshToken(userSaved)

        await this.repository.update(userSaved.id, {
            refreshToken: await argon2.hash(tokens.refreshToken),
        });

        return this.generateUserWithToken(userSaved, tokens)
    }

    async refreshToken(token: string) {
        const logInvalidRefreshToken = new LogBody("403", `Invalid refresh token`)

        try {
            const decoded = await this.jwtService.verifyAsync(token);
            if (!decoded?.sub) {
                this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logInvalidRefreshToken)
                throw new ForbiddenException("Invalid token");
            }

            const user = await this.repository.findOne({ where: { id: decoded.sub } });
            if (!user || !user.refreshToken) {
                const logAccessDenied = new LogBody("403", `Access denied`)
                this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logAccessDenied)
                throw new ForbiddenException("Access denied");
            }

            const isValid = await argon2.verify(user.refreshToken, token);
            if (!isValid) {
                this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logInvalidRefreshToken)
                throw new ForbiddenException("Invalid refresh token");
            }

            const tokens = await this.generateTokenAndRefreshToken(user);

            const newHash = await argon2.hash(tokens.refreshToken);
            await this.repository.update(user.id, { refreshToken: newHash });

            return this.generateUserWithToken(user, tokens);
        } catch (e) {
            this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logInvalidRefreshToken)
            throw new ForbiddenException("Invalid refresh token");
        }
    }

    // - Utils
    async generateTokenAndRefreshToken(user: UserEntity) {
        const payload = { sub: user.id, email: user.email };

        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: "1h"
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            expiresIn: "30d"
        });

        return {
            accessToken: accessToken,
            refreshToken: refreshToken
        }
    }

    generateUserWithToken(user: UserEntity, tokens: { accessToken: string, refreshToken: string }): UserWithTokenDto {
        const userResponse = new UserWithTokenDto()
        userResponse.id = user.id
        userResponse.firstName = user.firstName
        userResponse.lastName = user.lastName
        userResponse.email = user.email
        userResponse.role = user.role
        userResponse.accessToken = tokens.accessToken
        userResponse.refreshToken = tokens.refreshToken
        userResponse.createdAt = user.createdAt

        return userResponse;
    }


}
