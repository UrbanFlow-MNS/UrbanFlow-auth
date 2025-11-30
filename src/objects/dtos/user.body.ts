import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, MinLength } from "class-validator";
import { UserRoleType } from "../enums/user-role.enum";

export class UserBody {
  @ApiProperty({ example: "John", description: "User's first name" })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: "Doe", description: "User's last name" })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: "john.doe@example.com", description: "User's email address" })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: "MySecurePassword123!", 
    description: "User's password (minimum 10 characters)",
    minLength: 10
  })
  @MinLength(10)
  password: string;

  @ApiProperty({ 
    example: UserRoleType.CLASSIC_USER, 
    description: "User's role in the system",
    enum: UserRoleType,
    enumName: 'UserRoleType'
  })
  @IsEnum(UserRoleType)
  role: UserRoleType;
}