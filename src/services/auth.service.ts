import { AuthEventType, SetRefreshTokenDto, TokensDto, UserDto, UserSignInBody } from '@bato-urbanflow/urbanflow-models';
import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { IAuthService } from '../interfaces/IAuthService';
import { LogsService } from "./log.service";

@Injectable()
export class AuthService implements IAuthService {

    constructor(
        private readonly jwtService: JwtService,
        private readonly logsService: LogsService,
        @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    ) { }

    async signUp(body: UserSignInBody): Promise<UserDto> {
        const user: UserDto = await this.fetchOneUserByEmail(body.email)

        if (user) {
            throw new BadRequestException('User already exist')
        } else {
            const createdUser: UserDto = await this.createUser(body)

            if (createdUser) {
                const userWithTokens = await this.setTokens(createdUser)
                return userWithTokens
            } else {
                throw new BadRequestException('Fail to create')
            }
        }
    }

    async signIn(body: UserSignInBody) {
        const user: UserDto = await this.fetchOneUserByEmail(body.email)

        if (user) {
            const userWithTokens = await this.setTokens(user)
            return userWithTokens
        } else {
            throw new BadRequestException('Issue with sign in');
        }
    }

    async refreshToken(token: string) {
        try {
            const decoded = await this.jwtService.verifyAsync(token);

            if (!decoded?.sub) {
                throw new ForbiddenException("Invalid token");
            }

            const user = await this.fetchOneUserById(decoded.sub);

            if (!user || user.refreshToken !== token) {
                throw new ForbiddenException("Access denied");
            }

            return await this.setTokens(user);
        } catch {
            throw new ForbiddenException("Invalid refresh token");
        }
    }

    // MARK - Utils TCP
    async fetchOneUserById(id: number): Promise<UserDto> {
        return await firstValueFrom(
            this.userClient.send({ cmd: AuthEventType.FIND_ONE_BY_ID }, { id: id })
        );
    }

    async fetchOneUserByEmail(email: string): Promise<UserDto> {
        return await firstValueFrom(
            this.userClient.send({ cmd: AuthEventType.FIND_ONE_BY_EMAIL }, { email: email })
        );
    }

    async createUser(body: UserSignInBody): Promise<UserDto> {
        return await firstValueFrom(
            this.userClient.send({ cmd: AuthEventType.NEED_USER_CREATION }, body)
        );
    }

    async setRefreshToken(refreshTokenDto: SetRefreshTokenDto): Promise<UserDto> {
        return await firstValueFrom(
            this.userClient.send({ cmd: AuthEventType.SET_REFRESH_TOKEN }, refreshTokenDto)
        );
    }

    // MARK - Private logic
    private async setTokens(user: UserDto): Promise<UserDto> {
        if (user.id) {
            const tokens = await this.generateTokenAndRefreshToken(user)
            const dto = new SetRefreshTokenDto(user.id, tokens.refreshToken)
            const updatedUser: UserDto = await this.setRefreshToken(dto)
            updatedUser.accessToken = tokens.accessToken
            return updatedUser
        } else {
            throw new BadRequestException('No user id')
        }
    }

    async generateTokenAndRefreshToken(user: UserDto): Promise<TokensDto> {
        const payload = { sub: user.id };

        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: "1h"
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            expiresIn: "30d"
        });

        return new TokensDto(accessToken, refreshToken)
    }

}