import { IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserRoleType } from '../enums/user-role.enum';

export class UserDto {
    @IsNumber()
    @IsOptional() 
    id?: number;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString() 
    @IsOptional() 
    lastName?: string;

    @IsEmail() 
    @IsOptional() 
    email?: string;
    
    @IsEnum(UserRoleType) 
    @IsOptional() 
    role?: UserRoleType;

    @IsString() 
    @IsOptional() 
    accessToken?: string;

    @IsString() 
    @IsOptional() 
    refreshToken?: string;

    @IsOptional() 
    createdAt?: Date;

    constructor(partial?: Partial<UserDto>) {
        if (partial) {
            Object.assign(this, partial);
        }
    }
}