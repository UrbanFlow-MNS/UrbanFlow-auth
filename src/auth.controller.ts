import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserSignInBody } from './objects/dtos/user-signin.body';
import { UserBody } from './objects/dtos/user.body';

@Controller("/auth")
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post("/signUp")
    async signUp(@Body() body: UserBody) {
        return this.authService.signUp(body)
    }

    @Post("/signIn")
    async signIn(@Body() body: UserSignInBody) {
        return this.authService.signIn(body)
    }

    @Get("/refreshToken/:refreshToken")
    async refreshToken(@Param("refreshToken") refreshToken: string) {
        return this.authService.refreshToken(refreshToken)
    }

}
