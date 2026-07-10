import { UserDto, UserSignInBody, UserSignUpBody } from '@bato-urbanflow/urbanflow-models';
import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppConstants } from "../core/contants";
import { TcpAuthGuard } from "../guards/tcp-auth.guard";
import { IAuthService } from "../interfaces/auth-service.interface";

interface InternalEnvelope<T> {
    __internalSecret: string;
    payload: T;
}

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(TcpAuthGuard)
export class AuthController {
    constructor(@Inject(AppConstants.IAUTH_SERVICE) private readonly authService: IAuthService) { }

    /* Sign up */
    @ApiOperation({
        summary: 'User registration',
        description: 'Create a new user account with email, password, and personal information'
    })
    @ApiResponse({ status: 201, description: 'User successfully created and logged in', type: Object })
    @ApiResponse({ status: 400, description: 'Invalid data provided or email already exists' })
    @ApiBody({ type: UserSignUpBody })
    @MessagePattern({ cmd: 'auth.signUp' })
    @Post('signUp')
    async signUp(@Body() body: UserSignUpBody, @Payload() data?: InternalEnvelope<UserSignUpBody>) {
        const payload = data?.payload ?? body;
        return this.authService.signUp(payload);
    }

    /* Sign In */
    @ApiOperation({
        summary: 'User authentication',
        description: 'Log in with email and password to receive access and refresh tokens'
    })
    @ApiResponse({ status: 200, description: 'Successfully authenticated', type: UserDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiBody({ type: UserSignInBody })
    @MessagePattern({ cmd: 'auth.signIn' })
    @Post('signIn')
    async signIn(@Body() body: UserSignInBody, @Payload() data?: InternalEnvelope<UserSignInBody>) {
        const payload = data?.payload ?? body;
        return this.authService.signIn(payload);
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
    @ApiResponse({ status: 200, description: 'Token successfully refreshed', type: UserDto })
    @ApiResponse({ status: 403, description: 'Invalid or expired refresh token' })
    @MessagePattern({ cmd: 'auth.refreshToken' })
    async refreshToken(@Payload() data: InternalEnvelope<string> | string) {
        const token = typeof data === "string" ? data : data.payload;
        return this.authService.refreshToken(token);
    }

    /* Forgot password */
    @ApiOperation({
        summary: 'Forgot password',
        description: 'Sends a password recovery email if the email address exists in our system'
    })
    @ApiParam({
        name: 'email',
        description: 'The user\'s email address',
        example: 'theo@example.com'
    })
    @ApiResponse({
        status: 200,
        description: 'If the email exists, a reset link has been sent successfully'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid email format'
    })
    @MessagePattern({ cmd: 'auth.forgotPassword' })
    @Post("forgot-password/:email")
    async forgotPassword(@Param('email') email: string, @Payload() data?: InternalEnvelope<string> | string) {
        const value = data === undefined ? email : (typeof data === "string" ? data : data.payload);
        return this.authService.forgotPassword(value);
    }

}
