import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LogBody } from "./objects/dtos/log.body";
import { UserEntity } from "./objects/entities/user.entity";
import { RMQEventType } from "./objects/enums/rmq-event.enum";
import { LogsService } from "./services/log.service";

@Injectable()
export class UserService {

    constructor(
        private logsService: LogsService,
        @InjectRepository(UserEntity) private repository: Repository<UserEntity>,
        @Inject('LOGS_SERVICE') private readonly client: ClientProxy,
    ) {
        this.logsService = new LogsService(client)
    }

    async delete(id: number) {
        const existing = await this.repository.findOne({ where: { id: id } });
        if (existing) {
            await this.repository.delete(id)
            const logUserDeleted = new LogBody("200", `User ${existing.email} deleted`)
            this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logUserDeleted)
            return {
                statusCode: 200,
                message: 'User deleted successfully',
            };
        } else {
            const logUserNotFound = new LogBody("404", `User not found by id`)
            this.logsService.sendEvent(RMQEventType.LOGS_CREATED, logUserNotFound)
            throw new NotFoundException('User not found');
        }
    }

}