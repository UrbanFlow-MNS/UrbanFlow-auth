import { ApiProperty } from '@nestjs/swagger';
import { UserRoleType } from "../enums/user-role.enum";

export class UserWithTokenDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the user'
  })
  id: number;

  @ApiProperty({
    example: 'John',
    description: 'User first name'
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name'
  })
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address'
  })
  email: string;

  @ApiProperty({
    example: UserRoleType.CLASSIC_USER,
    description: 'User role in the system',
    enum: UserRoleType,
    enumName: 'UserRoleType'
  })
  role: UserRoleType;

  @ApiProperty({ description: 'JWT access token (expires in 1 hour)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token (expires in 30 days)' })
  refreshToken: string;

  @ApiProperty({ description: 'Creation date of the user' })
  createdAt: Date;
}