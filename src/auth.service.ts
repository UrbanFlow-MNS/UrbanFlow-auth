import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import * as argon2 from 'argon2';
import { Repository } from "typeorm";
import { UserSignInBody } from "./objects/dtos/user-signin.body";
import { UserWithTokenDto } from "./objects/dtos/user-with-token.dto";
import { UserBody } from "./objects/dtos/user.body";
import { UserEntity } from "./objects/entities/user.entity";

@Injectable()
export class AuthService {

    constructor(
        private jwtService: JwtService,
        @InjectRepository(UserEntity) private repository: Repository<UserEntity>,
        @Inject('AUTH_QUEUE_OUT') private readonly client: ClientProxy,
    ) { }

    async signIn(body: UserSignInBody) {
        const user = await this.repository.findOne({ where: { email: body.email } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isMatch = await argon2.verify(user.password, body.password);

        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokenAndRefreshToken(user);

        await this.repository.update(user.id, {
            refreshToken: await argon2.hash(tokens.refreshToken),
        });

        this.client.emit('logs_created', {
            microserviceName: "Auth",
            codeOfEvent: "200",
            event: "test event"
        });

        return this.generateUserWithToken(user, tokens);
    }

    async signUp(body: UserBody) {
        const existing = await this.repository.findOne({ where: { email: body.email } });
        if (existing) {
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
        try {

            const decoded = await this.jwtService.verifyAsync(token);
            if (!decoded?.sub) throw new ForbiddenException("Invalid token");

            const user = await this.repository.findOne({ where: { id: decoded.sub } });
            if (!user || !user.refreshToken) {
                throw new ForbiddenException("Access denied");
            }

            const isValid = await argon2.verify(user.refreshToken, token);
            if (!isValid) {
                throw new ForbiddenException("Invalid refresh token");
            }

            const tokens = await this.generateTokenAndRefreshToken(user);

            const newHash = await argon2.hash(tokens.refreshToken);
            await this.repository.update(user.id, { refreshToken: newHash });

            return this.generateUserWithToken(user, tokens);
        } catch (e) {
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

        return userResponse;
    }


}
