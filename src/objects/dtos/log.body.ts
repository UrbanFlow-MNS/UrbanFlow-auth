export class LogBody {
    microserviceName: string
    codeOfEvent: string
    event: string

    constructor(codeOfEvent: string, event: string) {
        this.microserviceName = "UrbanFlow-Auth"
        this.codeOfEvent = codeOfEvent
        this.event = event
    }
    
}