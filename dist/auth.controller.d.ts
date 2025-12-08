import { AuthService } from './auth.service';
import { UserSignInBody } from './objects/dtos/user-signin.body';
import { UserBody } from './objects/dtos/user.body';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signUp(body: UserBody): Promise<import("./objects/dtos/user-with-token.dto").UserWithTokenDto>;
    signIn(body: UserSignInBody): Promise<import("./objects/dtos/user-with-token.dto").UserWithTokenDto>;
    refreshToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
