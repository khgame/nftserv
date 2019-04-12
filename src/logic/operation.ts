import {Service} from "typedi";
import {OperationCode, OperationEntity} from "./entities";
import {ObjectID} from "typeorm";

@Service()
export class OperationService {
    static inst: OperationService;

    constructor() {
        OperationService.inst = this;
        console.log("Service: instance created ", OperationService.inst);
    }

    async get(opId: string) {
        if (!opId) {
            throw new Error('get operation error: opId cannot be empty');
        }
        return await OperationEntity.findOne(opId);
    }

    async create(opId: string, nftId: ObjectID, opCode: OperationCode, params: any){ // todo: sharding
        let op = new OperationEntity(opId, nftId, opCode, params);
        op = await op.save();
        return op;
    }

}
