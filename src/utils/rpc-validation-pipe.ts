import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

export class RpcValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map(e => Object.values(e.constraints ?? {}))
          .flat();

        const httpException = new BadRequestException(
          messages.length ? messages[0] : 'Validation error',
        );

        return new RpcException(httpException);
      },
    });
  }
}