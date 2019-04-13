import {Service} from "typedi";
import {ObjectID} from 'mongodb';
import {OpCode, OpModel} from "./model";
import {genLogger} from "./service/logger";

const log = genLogger("s:op");

@Service()
export class OpService {
    static inst: OpService;

    constructor() {
        OpService.inst = this;
        log.info("Service - instance created ", OpService.inst);
    }

    async get(opId: string) {
        // log.verbose("get");
        if (!opId || opId.length !== 24) {
            throw new Error(`get op error: opId<${opId}> must be a single String of 24 hex character`);
        }
        return await OpModel.findOne({_id: opId});
    }

    async create(serviceId: string, opId: string, nftId: ObjectID, opCode: OpCode, params: any) { // todo: sharding
        // log.verbose("create");
        if (!opId || opId.length !== 24) {
            throw new Error('create op error: opId must be a single String of 24 hex character');
        }
        return await OpModel.create({
            _id: opId,
            nft_id: nftId,
            op_code: opCode,
            creator: serviceId,
            params
        });
    }

}
