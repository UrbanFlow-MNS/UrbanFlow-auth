import { Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { LogBody, LogEventType } from "@bato-urbanflow/urbanflow-models";

export class LogsService {

    constructor(  
        @Inject('LOGS_SERVICE') private readonly client: ClientProxy
    ) { }

    sendEvent(event: string, content: any) {
        this.client.emit(event, content);
    }

    sendUserConnectedEvent(email: string) {
        const logUserConnected = new LogBody("UrbanFlow-Auth", "200", `User ${email} connected`)
        this.sendEvent(LogEventType.LOGS_CREATE, logUserConnected)
    }

}