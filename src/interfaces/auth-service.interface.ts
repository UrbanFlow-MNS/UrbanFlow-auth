import { UserSignInBody } from "@bato-urbanflow/urbanflow-models";
import { UserDtoGrpc } from "../../../proto/generated/typescript/user";

export interface IAuthService {
    signUp(body: UserSignInBody): Promise<UserDtoGrpc>;
    signIn(body: UserSignInBody): Promise<UserDtoGrpc>;
    refreshToken(token: string): Promise<UserDtoGrpc>;
    forgotPassword(email: string): Promise<{ message: string }>;
}