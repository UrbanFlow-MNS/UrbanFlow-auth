import { UserRoleType } from '../enums/user-role.enum';
export declare class UserEntity {
    id: number;
    firstName: string;
    lastName: string;
    role: UserRoleType;
    email: string;
    password: string;
    refreshToken?: string;
}
