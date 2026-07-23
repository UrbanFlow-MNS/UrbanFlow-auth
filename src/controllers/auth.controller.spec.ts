import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AppConstants } from "../core/contants";
import { TcpAuthGuard } from "../guards/tcp-auth.guard";
import { IAuthService } from "../interfaces/auth-service.interface";

describe("AuthController", () => {
    let controller: AuthController;
    let authService: {
        signUp: ReturnType<typeof vi.fn>;
        signIn: ReturnType<typeof vi.fn>;
        refreshToken: ReturnType<typeof vi.fn>;
        forgotPassword: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authService = {
            signUp: vi.fn().mockResolvedValue({ id: 1 }),
            signIn: vi.fn().mockResolvedValue({ id: 1 }),
            refreshToken: vi.fn().mockResolvedValue({ id: 1 }),
            forgotPassword: vi.fn().mockResolvedValue({ message: "ok" }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AppConstants.IAUTH_SERVICE,
                    useValue: authService as unknown as IAuthService,
                },
            ],
        })
            .overrideGuard(TcpAuthGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuthController>(AuthController);
    });

    describe("signUp", () => {
        it("forwards the envelope payload to the service", async () => {
            const body = { email: "body@example.com" } as any;
            const payload = { email: "payload@example.com" } as any;

            await controller.signUp(body, { __internalSecret: "s", payload });

            expect(authService.signUp).toHaveBeenCalledWith(payload);
        });

        it("falls back to the body when no envelope is provided", async () => {
            const body = { email: "body@example.com" } as any;

            await controller.signUp(body, undefined);

            expect(authService.signUp).toHaveBeenCalledWith(body);
        });
    });

    describe("signIn", () => {
        it("forwards the envelope payload to the service", async () => {
            const body = { email: "body@example.com" } as any;
            const payload = { email: "payload@example.com" } as any;

            await controller.signIn(body, { __internalSecret: "s", payload });

            expect(authService.signIn).toHaveBeenCalledWith(payload);
        });

        it("falls back to the body when no envelope is provided", async () => {
            const body = { email: "body@example.com" } as any;

            await controller.signIn(body, undefined);

            expect(authService.signIn).toHaveBeenCalledWith(body);
        });
    });

    describe("refreshToken", () => {
        it("passes a raw string token through", async () => {
            await controller.refreshToken("raw-token");

            expect(authService.refreshToken).toHaveBeenCalledWith("raw-token");
        });

        it("unwraps the token from an envelope", async () => {
            await controller.refreshToken({ __internalSecret: "s", payload: "enveloped-token" });

            expect(authService.refreshToken).toHaveBeenCalledWith("enveloped-token");
        });
    });

    describe("forgotPassword", () => {
        it("uses the email param when no envelope is provided", async () => {
            await controller.forgotPassword("param@example.com", undefined);

            expect(authService.forgotPassword).toHaveBeenCalledWith("param@example.com");
        });

        it("uses the payload from an envelope", async () => {
            await controller.forgotPassword("param@example.com", {
                __internalSecret: "s",
                payload: "payload@example.com",
            });

            expect(authService.forgotPassword).toHaveBeenCalledWith("payload@example.com");
        });
    });
});
