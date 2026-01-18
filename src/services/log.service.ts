import { Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { RMQEventType } from "../objects/enums/rmq-event.enum";

export class LogsService {

    constructor(  
        @Inject('LOGS_SERVICE') private readonly client: ClientProxy
    ) { }

    sendEvent(event: RMQEventType, content: any) {
        this.client.emit(event, content);
    }

}