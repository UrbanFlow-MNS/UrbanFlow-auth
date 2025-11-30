import { JwtService } from '@nestjs/jwt';
import { Repository } from "typeorm";
import { UserSignInBody } from "./objects/dtos/user-signin.body";
import { UserWithTokenDto } from "./objects/dtos/user-with-token.dto";
import { UserBody } from "./objects/dtos/user.body";
import { UserEntity } from "./objects/entities/user.entity";
export declare class AuthService {
    private jwtService;
    private repository;
    constructor(jwtService: JwtService, repository: Repository<UserEntity>);
    signIn(body: UserSignInBody): Promise<UserWithTokenDto>;
    signUp(body: UserBody): Promise<UserWithTokenDto>;
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    generateTokenAndRefreshToken(user: UserEntity): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
