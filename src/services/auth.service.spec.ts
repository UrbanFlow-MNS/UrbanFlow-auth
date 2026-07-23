import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RpcException } from "@nestjs/microservices";
import { of } from "rxjs";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { LogsService } from "../logs-service/log.service";
import { UserRoleType } from "../../../proto/generated/typescript/user";

vi.mock("argon2", () => ({
    verify: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed-refresh"),
    argon2id: 2,
}));

const mockUserService = {
    findOneByEmail: vi.fn(),
    createUser: vi.fn(),
    checkUserCredentials: vi.fn(),
    findOneById: vi.fn(),
    setRefreshToken: vi.fn(),
};

const userGrpc = {
    id: 1,
    firstName: "Theo",
    lastName: "Sementa",
    email: "theo@example.com",
    role: UserRoleType.CLASSIC_USER,
};

describe("AuthService", () => {
    let service: AuthService;
    let logsService: LogsService;
    let notificationClient: { emit: ReturnType<typeof vi.fn> };
    let getService: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockUserService.findOneByEmail.mockReturnValue(of({ user: undefined }));
        mockUserService.createUser.mockReturnValue(of(userGrpc));
        mockUserService.checkUserCredentials.mockReturnValue(of({ user: userGrpc }));
        mockUserService.findOneById.mockReturnValue(of({ user: userGrpc }));
        mockUserService.setRefreshToken.mockReturnValue(of(userGrpc));

        getService = vi.fn().mockReturnValue(mockUserService);
        notificationClient = { emit: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: vi.fn().mockResolvedValue("signed.jwt"),
                        verifyAsync: vi.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: { get: vi.fn().mockReturnValue("secret") },
                },
                {
                    provide: LogsService,
                    useValue: { sendUserConnectedEvent: vi.fn() },
                },
                {
                    provide: "NOTIFICATIONS_SERVICE",
                    useValue: notificationClient,
                },
                {
                    provide: "USER_PACKAGE",
                    useValue: { getService },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        logsService = module.get<LogsService>(LogsService);
        service.onModuleInit();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("signUp", () => {
        const body = {
            firstName: "Theo",
            lastName: "Sementa",
            email: "new@example.com",
            password: "password123",
            role: UserRoleType.CLASSIC_USER,
        } as any;

        it("rejects when the email already exists", async () => {
            mockUserService.findOneByEmail.mockReturnValue(of({ user: userGrpc }));

            await expect(service.signUp(body)).rejects.toBeInstanceOf(RpcException);
            expect(mockUserService.createUser).not.toHaveBeenCalled();
        });

        it("rejects when created user has no id", async () => {
            mockUserService.createUser.mockReturnValue(of({}));

            await expect(service.signUp(body)).rejects.toBeInstanceOf(RpcException);
        });

        it("resolves with tokens and logs the connection on success", async () => {
            mockUserService.setRefreshToken.mockReturnValue(
                of({ ...userGrpc, email: "new@example.com" }),
            );

            const result = await service.signUp(body);

            expect(result.accessToken).toBe("signed.jwt");
            expect(result.refreshToken).toBe("signed.jwt");
            expect(logsService.sendUserConnectedEvent).toHaveBeenCalledWith("new@example.com");
        });
    });

    describe("signIn", () => {
        const body = { email: "theo@example.com", password: "password123" } as any;

        it("rejects with RpcException when credentials are invalid", async () => {
            mockUserService.checkUserCredentials.mockReturnValue(of({ user: undefined }));

            await expect(service.signIn(body)).rejects.toBeInstanceOf(RpcException);
        });

        it("resolves with tokens and logs the connection on success", async () => {
            const result = await service.signIn(body);

            expect(result.accessToken).toBe("signed.jwt");
            expect(result.refreshToken).toBe("signed.jwt");
            expect(logsService.sendUserConnectedEvent).toHaveBeenCalledWith("theo@example.com");
        });
    });

    describe("refreshToken", () => {
        let jwtService: JwtService;

        beforeEach(() => {
            jwtService = service["jwtService"];
        });

        it("rejects when the token type is not refresh", async () => {
            (jwtService.verifyAsync as any).mockResolvedValue({ sub: 1, typ: "access" });

            await expect(service.refreshToken("tok")).rejects.toBeInstanceOf(RpcException);
        });

        it("rejects when the decoded token has no sub", async () => {
            (jwtService.verifyAsync as any).mockResolvedValue({ typ: "refresh" });

            await expect(service.refreshToken("tok")).rejects.toBeInstanceOf(RpcException);
        });

        it("rejects when the user has no stored refresh token", async () => {
            (jwtService.verifyAsync as any).mockResolvedValue({ sub: 1, typ: "refresh" });
            mockUserService.findOneById.mockReturnValue(of({ user: { ...userGrpc, refreshToken: undefined } }));

            await expect(service.refreshToken("tok")).rejects.toBeInstanceOf(RpcException);
        });

        it("rejects when argon2 verification fails", async () => {
            (jwtService.verifyAsync as any).mockResolvedValue({ sub: 1, typ: "refresh" });
            mockUserService.findOneById.mockReturnValue(of({ user: { ...userGrpc, refreshToken: "stored-hash" } }));
            (argon2.verify as any).mockResolvedValue(false);

            await expect(service.refreshToken("tok")).rejects.toBeInstanceOf(RpcException);
        });

        it("resolves with new tokens on success", async () => {
            (jwtService.verifyAsync as any).mockResolvedValue({ sub: 1, typ: "refresh" });
            mockUserService.findOneById.mockReturnValue(of({ user: { ...userGrpc, refreshToken: "stored-hash" } }));
            (argon2.verify as any).mockResolvedValue(true);

            const result = await service.refreshToken("tok");

            expect(result.accessToken).toBe("signed.jwt");
            expect(result.refreshToken).toBe("signed.jwt");
            expect(mockUserService.setRefreshToken).toHaveBeenCalled();
        });
    });

    describe("forgotPassword", () => {
        it("emits the notification and returns the anti-enumeration message", async () => {
            const result = await service.forgotPassword("theo@example.com");

            expect(notificationClient.emit).toHaveBeenCalledTimes(1);
            expect(notificationClient.emit).toHaveBeenCalledWith(
                "notifications.sendEmail",
                expect.objectContaining({ email: "theo@example.com" }),
            );
            expect(result).toEqual({ message: expect.any(String) });
        });
    });
});
