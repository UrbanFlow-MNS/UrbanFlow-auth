import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LogsService } from "./log.service";

@Module({
    imports: [
        ClientsModule.register([
            {
                name: "LOGS_SERVICE",
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBIT_MQ ?? ""],
                    queue: "LOGS_QUEUE",
                    queueOptions: { durable: false },
                },
            }
        ])
    ],
    providers: [LogsService],
    exports: [LogsService]
})

export class LogsModule { }
