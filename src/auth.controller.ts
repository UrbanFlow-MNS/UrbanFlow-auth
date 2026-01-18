import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserSignInBody } from './objects/dtos/user-signin.body';
import { UserWithTokenDto } from './objects/dtos/user-with-token.dto';
import { UserBody } from './objects/dtos/user.body';

import { RpcValidationPipe } from './utils/rpc-validation-pipe';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /* Sign up */
    @ApiOperation({
        summary: 'User registration',
        description: 'Create a new user account with email, password, and personal information'
    })
    @ApiResponse({ status: 201, description: 'User successfully created and logged in', type: UserWithTokenDto })
    @ApiResponse({ status: 400, description: 'Invalid data provided or email already exists' })
    @ApiBody({ type: UserBody })
    @Post('signUp')
    async signUp(@Body() body: UserBody) {
        return this.authService.signUp(body);
    }

    @MessagePattern({ cmd: 'auth.signUp' })
    signUpTcp(@Payload(new RpcValidationPipe()) data: UserBody) {
        return this.authService.signUp(data);
    }

    /* Sign In */
    @ApiOperation({
        summary: 'User authentication',
        description: 'Log in with email and password to receive access and refresh tokens'
    })
    @ApiResponse({ status: 200, description: 'Successfully authenticated', type: UserWithTokenDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiBody({ type: UserSignInBody })
    @Post('signIn')
    async signIn(@Body() body: UserSignInBody) {
        return this.authService.signIn(body);
    }

    @MessagePattern({ cmd: 'auth.signIn' })
    signInTcp(@Payload(new RpcValidationPipe()) data: UserSignInBody) {
        return this.authService.signIn(data);
    }

    /* Refresh Token */
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Generate a new access token using a valid refresh token'
    })
    @ApiParam({
        name: 'refreshToken',
        description: 'The refresh token received during login',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    })
    @ApiResponse({ status: 200, description: 'Token successfully refreshed', type: UserWithTokenDto })
    @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
    @Get('refreshToken/:refreshToken')
    async refreshToken(@Param('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }

    @MessagePattern({ cmd: 'auth.refreshToken' })
    refreshTokenTcp(@Payload(new RpcValidationPipe()) data: string) {
        return this.authService.refreshToken(data);
    }
}
