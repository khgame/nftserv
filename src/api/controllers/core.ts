import {API, Get} from "../decorators";

@API("/core")
export class ServerController {

    constructor() {
    }

    @Get("/info")
    public async getInfo() {
        return {
            version: "0.1.0",
        }; // mock todo
    }

}
