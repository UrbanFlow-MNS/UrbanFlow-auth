import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Buffer } from "buffer";
import { timingSafeEqual } from "crypto";

@Injectable()
export class TcpAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        if (context.getType() !== "rpc") {
            return true;
        }

        const data = context.switchToRpc().getData();
        const provided = data?.__internalSecret;
        const expected = process.env.AUTH_INTERNAL_SECRET;

        if (typeof provided !== "string" || typeof expected !== "string") {
            throw new RpcException("Unauthorized internal call");
        }

        const providedBuf = Buffer.from(provided);
        const expectedBuf = Buffer.from(expected);

        if (providedBuf.length !== expectedBuf.length) {
            throw new RpcException("Unauthorized internal call");
        }

        if (!timingSafeEqual(providedBuf, expectedBuf)) {
            throw new RpcException("Unauthorized internal call");
        }

        return true;
    }
}
