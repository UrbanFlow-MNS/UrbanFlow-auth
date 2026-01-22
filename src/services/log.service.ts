import { Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

export class LogsService {

    constructor(  
        @Inject('LOGS_SERVICE') private readonly client: ClientProxy
    ) { }

    sendEvent(event: string, content: any) {
        this.client.emit(event, content);
    }

}