"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const bcrypt = require("bcrypt");
const typeorm_2 = require("typeorm");
const user_with_token_dto_1 = require("./objects/dtos/user-with-token.dto");
const user_entity_1 = require("./objects/entities/user.entity");
let AuthService = class AuthService {
    jwtService;
    repository;
    constructor(jwtService, repository) {
        this.jwtService = jwtService;
        this.repository = repository;
    }
    async signIn(body) {
        const user = await this.repository.findOne({ where: { email: body.email } });
        if (!user) {
            throw new common_1.NotFoundException();
        }
        const isMatch = await bcrypt.compare(body.password, user.password);
        if (!isMatch) {
            throw new common_1.UnauthorizedException();
        }
        const tokens = await this.generateTokenAndRefreshToken(user);
        const userResponse = new user_with_token_dto_1.UserWithTokenDto();
        userResponse.id = user.id;
        userResponse.firstName = user.firstName;
        userResponse.lastName = user.lastName;
        userResponse.email = user.email;
        userResponse.role = user.role;
        userResponse.token = tokens.accessToken;
        userResponse.refreshToken = tokens.refreshToken;
        return userResponse;
    }
    async signUp(body) {
        const existing = await this.repository.findOne({ where: { email: body.email } });
        if (existing) {
            throw new common_1.BadRequestException("Email already used");
        }
        const hashedPassword = await bcrypt.hash(body.password, 10);
        const userCreated = this.repository.create({
            ...body,
            password: hashedPassword,
        });
        const userSaved = await this.repository.save(userCreated);
        const tokens = await this.generateTokenAndRefreshToken(userSaved);
        const userResponse = new user_with_token_dto_1.UserWithTokenDto();
        userResponse.id = userSaved.id;
        userResponse.firstName = userSaved.firstName;
        userResponse.lastName = userSaved.lastName;
        userResponse.email = userSaved.email;
        userResponse.role = userSaved.role;
        userResponse.token = tokens.accessToken;
        userResponse.refreshToken = tokens.refreshToken;
        return userResponse;
    }
    async refreshToken(token) {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            const user = await this.repository.findOne({ where: { id: payload.sub } });
            if (!user || !user.refreshToken) {
                throw new common_1.ForbiddenException("Access denied");
            }
            const isValid = await bcrypt.compare(token, user.refreshToken);
            if (!isValid) {
                throw new common_1.ForbiddenException("Invalid refresh token");
            }
            const tokens = await this.generateTokenAndRefreshToken(user);
            const hashedRefresh = await bcrypt.hash(tokens.refreshToken, 10);
            await this.repository.update(user.id, { refreshToken: hashedRefresh });
            return tokens;
        }
        catch (e) {
            throw new common_1.ForbiddenException("Invalid refresh token");
        }
    }
    async generateTokenAndRefreshToken(user) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: "1h"
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            expiresIn: "30d"
        });
        await this.repository.update(user.id, {
            refreshToken: await bcrypt.hash(refreshToken, 10)
        });
        return {
            accessToken: accessToken,
            refreshToken: refreshToken
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.UserEntity)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map