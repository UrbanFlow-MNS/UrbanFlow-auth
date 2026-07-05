import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: "NOTIFICATIONS_SERVICE",
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBIT_MQ ?? ""],
                    queue: "NOTIFICATIONS_QUEUE",
                    queueOptions: { durable: false },
                },
            }
        ])
    ],
    exports: [ClientsModule]
})

export class NotificationsModule { }
