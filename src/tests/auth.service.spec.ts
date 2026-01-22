import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { UserEntity } from '../objects/entities/user.entity';
import { UserRoleType } from '../objects/enums/user-role.enum';
import { AuthService } from '../services/auth.service';
import { LogsService } from '../services/log.service';

// Mock de argon2
jest.mock('argon2');

describe('AuthService', () => {
    let service: AuthService;
    let repository: Repository<UserEntity>;
    let jwtService: JwtService;
    let logsService: LogsService;

    const mockUser = new UserEntity();
    mockUser.id = 1
    mockUser.email = 'theo@example.com'
    mockUser.password = 'hashed_password'
    mockUser.firstName = 'Théo'
    mockUser.lastName = 'Sementa'
    mockUser.role = UserRoleType.SUPERADMIN
    mockUser.refreshToken = 'hashed_refresh_token'

    const mockTokens = {
        accessToken: 'access_token_val',
        refreshToken: 'refresh_token_val',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn().mockResolvedValue('token'),
                        verifyAsync: jest.fn().mockResolvedValue({ sub: 'uuid-123' }),
                    },
                },
                {
                    provide: LogsService,
                    useValue: {
                        sendEvent: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(UserEntity),
                    useValue: {
                        findOne: jest.fn(),
                        update: jest.fn(),
                        create: jest.fn(),
                        save: jest.fn(),
                    },
                },
                {
                    provide: 'LOGS_SERVICE',
                    useValue: { emit: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        repository = module.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
        jwtService = module.get<JwtService>(JwtService);
        logsService = module.get<LogsService>(LogsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('signIn', () => {
        it('should throw NotFoundException if user does not exist', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);

            await expect(service.signIn({ email: 'wrong@test.com', password: 'password123' }))
                .rejects.toThrow(NotFoundException);

            expect(logsService.sendEvent).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if password does not match', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(false);

            await expect(service.signIn({ email: mockUser.email, password: 'wrong_password' }))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should return user with tokens on success', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            (argon2.hash as jest.Mock).mockResolvedValue('new_refresh_hash');
            jest.spyOn(repository, 'update').mockResolvedValue(undefined as any);

            jest.spyOn(service, 'generateTokenAndRefreshToken').mockResolvedValue(mockTokens);

            const result = await service.signIn({ email: mockUser.email, password: 'password123' });

            expect(result).toHaveProperty('accessToken');
            expect(result.email).toEqual(mockUser.email);
            expect(repository.update).toHaveBeenCalledWith(mockUser.id, { refreshToken: 'new_refresh_hash' });
        });
    });

    describe('signUp', () => {
        it('should throw BadRequestException if email already used', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);

            await expect(service.signUp({ email: mockUser.email, password: 'password123' } as any))
                .rejects.toThrow(BadRequestException);
        });

        it('should create and save a new user', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockResolvedValue('hashed_pwd');
            jest.spyOn(repository, 'create').mockReturnValue(mockUser as any);
            jest.spyOn(repository, 'save').mockResolvedValue(mockUser as any);
            jest.spyOn(service, 'generateTokenAndRefreshToken').mockResolvedValue(mockTokens);

            const result = await service.signUp({ email: 'new@test.com', password: 'password123' } as any);

            expect(repository.save).toHaveBeenCalled();
            expect(result.email).toBe(mockUser.email);
        });
    });

    describe('refreshToken', () => {
        it('should throw ForbiddenException if token verification fails', async () => {
            jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error());

            await expect(service.refreshToken('invalid_token'))
                .rejects.toThrow(ForbiddenException);
        });

        it('should rotate the refresh token on success', async () => {
            jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: mockUser.id });
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            (argon2.hash as jest.Mock).mockResolvedValue('new_hash');

            const result = await service.refreshToken('old_refresh_token');

            expect(repository.update).toHaveBeenCalled();
            expect(result).toHaveProperty('accessToken');
        });
    });
});