import {Get, JsonController} from "routing-controllers";
import {Service} from "typedi";

@Service()
@JsonController("/core")
export class CoreController {
    constructor() {
    }

    @Get("/info")
    public async getRules() {
        return {
            version: 1
        };
    }
}
