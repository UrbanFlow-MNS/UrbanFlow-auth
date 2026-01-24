import { TokensDto, UserDto, UserSignInBody } from "@bato-urbanflow/urbanflow-models";

export interface IAuthService {
    signUp(body: UserSignInBody): Promise<UserDto>;
    signIn(body: UserSignInBody): Promise<UserDto>;
    refreshToken(token: string): Promise<UserDto>;
    generateTokenAndRefreshToken(user: UserDto): Promise<TokensDto>;
}