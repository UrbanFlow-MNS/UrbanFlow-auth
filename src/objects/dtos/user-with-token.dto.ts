import { UserRoleType } from "../enums/user-role.enum"

export class UserWithTokenDto {
  id: number
  firstName: string
  lastName: string
  email: string
  role: UserRoleType
  accessToken: string
  refreshToken: string
}