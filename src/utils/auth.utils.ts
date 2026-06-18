import { AuthEventType, SetRefreshTokenDto, TokensDto, UserDto, UserSignInBody } from "@bato-urbanflow/urbanflow-models";
import { Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { catchError, firstValueFrom, throwError } from "rxjs";

export class AuthUtils {

    constructor(
        private readonly jwtService: JwtService,
        @Inject('USER_SERVICE') private readonly userClient: ClientProxy,
    ) { }

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

    async fetchCheckCredentials(email: string, password: string): Promise<boolean> {
        return await firstValueFrom(
            this.userClient.send({ cmd: 'auth.checkUserCredentials' }, { email, password })
        );
    }

    async createUser(body: UserSignInBody): Promise<UserDto> {
        return await firstValueFrom(
            this.userClient.send({ cmd: AuthEventType.NEED_USER_CREATION }, body).pipe(
                catchError(err => throwError(() => new RpcException(err)))
            )
        );
    }

    async setRefreshToken(refreshTokenDto: SetRefreshTokenDto): Promise<UserDto> {
        return await firstValueFrom(
            this.userClient.send({ cmd: AuthEventType.SET_REFRESH_TOKEN }, refreshTokenDto)
        );
    }

    async setTokens(user: UserDto): Promise<UserDto> {
        if (user.id) {
            const tokens = await this.generateTokenAndRefreshToken(user)
            const dto = new SetRefreshTokenDto(user.id, tokens.refreshToken)
            const updatedUser: UserDto = await this.setRefreshToken(dto)
            updatedUser.accessToken = tokens.accessToken
            return updatedUser
        } else {
            throw new RpcException({ statusCode: 400, message: 'No user id' })
        }
    }

    async generateTokenAndRefreshToken(user: UserDto): Promise<TokensDto> {
        const payload = { sub: user.id, role: user.role };

        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: "1h" });
        const refreshToken = await this.jwtService.signAsync(payload, { expiresIn: "30d" });

        return new TokensDto(accessToken, refreshToken)
    }

}