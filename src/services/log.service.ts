import { ClientProxy } from "@nestjs/microservices";
import { RMQEventType } from "../objects/enums/rmq-event.enum";

export class LogsService {
    private readonly client: ClientProxy

    constructor(client: ClientProxy) {
        this.client = client
    }

    sendEvent(event: RMQEventType, content: any) {
        this.client.emit(event, content);
    }

}