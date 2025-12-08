import { ApiProperty } from "@nestjs/swagger"

export class UserSignInBody {
  
  @ApiProperty({ example: 'user@example.com', description: `User's mail` })
  email: string

  @ApiProperty({ example: '57Urb@nFl@w!', description: `User's password` })
  password: string

}