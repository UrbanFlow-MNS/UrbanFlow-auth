import { IsNotEmpty } from "class-validator"

export class SetRefreshTokenDto {

    @IsNotEmpty()
    userId: number

    @IsNotEmpty()
    refreshToken: string

    constructor(
        userId: number,
        refreshToken: string
    ) {
        this.userId = userId
        this.refreshToken = refreshToken
    }
}