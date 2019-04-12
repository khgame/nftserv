import {Service} from "typedi";
import {ObjectID} from 'mongodb';
import {OpCode, OpModel} from "./model";

@Service()
export class OpService {
    static inst: OpService;

    constructor() {
        OpService.inst = this;
        console.log("Service: instance created ", OpService.inst);
    }

    async get(opId: string) {
        console.log("get op", opId);
        if (!opId || opId.length !== 24) {
            throw new Error(`get op error: opId<${opId}> must be a single String of 24 hex character`);
        }
        return await OpModel.findOne({_id: opId});
    }

    async create(opId: string, nftId: ObjectID, opCode: OpCode, params: any) { // todo: sharding
        console.log("op create:", opId);
        if (!opId || opId.length !== 24) {
            throw new Error('create op error: opId must be a single String of 24 hex character');
        }
        return await OpModel.create({
            _id: opId,
            nft_id: nftId,
            op_code: opCode,
            params
        });
    }

}
