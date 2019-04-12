import {Service} from "typedi";
import {OperationCode, OperationEntity} from "./entities";
import {ObjectID} from 'mongodb';

@Service()
export class OperationService {
    static inst: OperationService;

    constructor() {
        OperationService.inst = this;
        console.log("Service: instance created ", OperationService.inst);
    }

    async get(opId: string) {
        console.log("get op", opId);
        if (!opId || opId.length !== 24) {
            throw new Error(`get op error: opId<${opId}> must be a single String of 24 hex character`);
        }
        return await OperationEntity.findOne({op_id: opId});
    }

    async create(opId: string, nftId: ObjectID, opCode: OperationCode, params: any) { // todo: sharding
        console.log("create", opId);

        if (!opId || opId.length !== 24) {
            throw new Error('create op error: opId must be a single String of 24 hex character');
        }

        // let real_op_id = ObjectID.createFromHexString(opId);
        // console.log("= opId", opId, real_op_id);

        let op = new OperationEntity();

        op.op_id = opId; // real_op_id.toHexString();
        op.nft_id = nftId;
        op.op_code = opCode;
        op.params = params;

        // console.log("= op", op);
        op = await op.save();
        // console.log("= saved");
        return op;
    }

}
