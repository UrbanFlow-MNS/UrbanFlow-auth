import { UserDto, UserSignInBody, UserSignUpBody } from '@bato-urbanflow/urbanflow-models';
import {Body, Controller, Get, Inject, Param, Post} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {IAuthService} from "../interfaces/auth-service.interface";
import {AppConstants} from "../core/contants";

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(@Inject(AppConstants.IAUTH_SERVICE) private readonly authService: IAuthService) { }

    /* Sign up */
    @ApiOperation({
        summary: 'User registration',
        description: 'Create a new user account with email, password, and personal information'
    })
    @ApiResponse({ status: 201, description: 'User successfully created and logged in', type: UserDto })
    @ApiResponse({ status: 400, description: 'Invalid data provided or email already exists' })
    @ApiBody({ type: UserSignUpBody })
    @MessagePattern({ cmd: 'auth.signUp' })
    @Post('signUp')
    async signUp(@Body() body: UserSignUpBody) {
        return this.authService.signUp(body);
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
    async signIn(@Body() body: UserSignInBody) {
        return this.authService.signIn(body);
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
    @Get('refresh-token/:refreshToken')
    async refreshToken(@Param('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
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
    @Post("forgot-password/:email")
    async forgotPassword(@Param('email') email: string) {
        return this.authService.forgotPassword(email)
    }

}
