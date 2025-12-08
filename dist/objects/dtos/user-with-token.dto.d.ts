import { UserRoleType } from "../enums/user-role.enum";
export declare class UserWithTokenDto {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRoleType;
    token: string;
    refreshToken: string;
}
