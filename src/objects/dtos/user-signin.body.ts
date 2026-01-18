import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, MinLength } from "class-validator"

export class UserSignInBody {
  
  @ApiProperty({ example: 'user@example.com', description: `User's mail` })
  @IsEmail()
  email: string

  @ApiProperty({ example: '57Urb@nFl@w!', description: `User's password` })
  @MinLength(10)
  password: string

}