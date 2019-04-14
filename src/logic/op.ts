import {Service} from "typedi";
import {ObjectID} from 'mongodb';
import {
    IBurnParams,
    IIssueParams,
    ITransferParams,
    IUpdateParams,
    NftModel,
    NftTerminatedModel,
    OpCode,
    OpModel,
    OpStatus
} from "./model";
import {genLogger} from "./service/logger";
import {Logger} from "winston";
import {IOp} from "./model";
import {ok, sEqual, sNotEqual} from "./service/assert";
import {redisUnlock} from "./service/redis";

@Service()
export class OpService {
    static inst: OpService;
    log: Logger;

    constructor() {
        OpService.inst = this;
        this.log = genLogger("s:op");
        this.log.debug("Service - instance created ", OpService.inst);
    }

    async get(opId: string): Promise<IOp | null> {
        if (!opId || opId.length !== 24) {
            throw new Error(`get op error: opId<${opId}> must be a single String of 24 hex character`);
        }
        return await OpModel.findOne({_id: opId});
    }

    async create(serviceId: string, opId: string, nftId: ObjectID, opCode: OpCode, params: any) { // todo: sharding
        if (!opId || opId.length !== 24) {
            throw new Error('create op error: opId must be a single String of 24 hex character');
        }
        switch (opCode) {
            case OpCode.ISSUE:
                ok(params as IIssueParams, `op create error: params should be IIssueParams`);
                break;
            case OpCode.BURN:
                ok(params as IBurnParams, `op create error: params should be IBurnParams`);
                break;
            case OpCode.UPDATE:
                ok(params as IUpdateParams, `op create error: params should be IUpdateParams`);
                break;
            case OpCode.TRANSFER:
                ok(params as ITransferParams, `op create error: params should be ITransferParams`);
                break;
            default:
                throw new Error(`execute op error: got invalid op code ${opCode}`);
        }

        return await OpModel.create({
            _id: opId,
            nft_id: nftId,
            op_code: opCode,
            creator: serviceId,
            params
        });
    }

    async exec(opId: string) {
        let op = await this.get(opId);
        ok(op, () => `exec error : create op<${opId}> record failed`);

        switch (op!.op_code) {
            case OpCode.ISSUE:
                return await this.execIssue(op!.params as IIssueParams, op!);
            case OpCode.BURN:
                return await this.execBurn(op!.params as IBurnParams, op!);
            case OpCode.UPDATE:
                return await this.execUpdate(op!.params as IUpdateParams, op!);
            case OpCode.TRANSFER:
                return await this.execTransfer(op!.params as ITransferParams, op!);
            default:
                throw new Error(`execute op error: got invalid op code ${op!.op_code}`);
        }
    }

    private async commit(op: IOp) {
        await OpModel.updateOne({_id: op._id}, {state: OpStatus.SUCCESS});
    }

    private async abort(op: IOp) {
        await OpModel.updateOne({_id: op._id}, {state: OpStatus.FAILED});
    }

    private async execIssue(params: IIssueParams, op: IOp) {
        this.log.verbose("exec issue start");
        try {
            this.log.verbose("issue - create nftd");
            const {owner_id, logic_mark, data} = params;

            let nftd = await NftModel.create({_id: op.nft_id || new ObjectID(), owner_id, logic_mark, data});
            ok(nftd, `issue error : create nftd failed`);

            return await this.commit(op);
        } catch (ex) {
            return await this.abort(op);
        }
    }

    private async execBurn(params: IBurnParams, op: IOp) {
        this.log.verbose("exec burn start");
        try {

            const nftd = await NftModel.findOne({_id: op.nft_id});
            ok(nftd, () => `burn error : nft<${op.nft_id}> is not exist`);

            /** write operations
             * 1. create operation
             * 2. delete nft
             *  1. create nftT
             *  2. remove nft
             */

            this.log.verbose("burn - delete nftd");
            const {_id, owner_id, logic_mark, data, created_at, update_at} = nftd!;
            const nftT = await NftTerminatedModel.create({_id, owner_id, logic_mark, data, created_at, update_at});
            ok(nftT, () => `burn error: create terminated nft<${op.nft_id}> failed`);
            this.log.info("deleteOne - nft_terminated created " + op.nft_id + " => " + nftT._id);

            const ret = await NftModel.deleteOne({_id: op.nft_id});
            this.log.info("deleteOne - nft removed " + op.nft_id);
            ok(ret, () => `deleteOne error: delete nft<${op.nft_id}> failed`);

            return await this.commit(op);
        } catch (ex) {
            return await this.abort(op);
        }
    }

    private async execUpdate(params: IUpdateParams, op: IOp) {
        this.log.verbose("exec update start");
        try {
            const nftd = await NftModel.findOne({_id: op.nft_id});
            ok(nftd, () => `update error : nft<${op.nft_id}> is not exist`);

            /** write operations
             * 1. create operation
             * 2. update nft
             */
            const {data} = params;
            const ret = await NftModel.findOneAndUpdate(
                {_id: op.nft_id},
                {
                    $set: {data}
                });
            ok(nftd, () => `update error : set nft<${op.nft_id}>'s data to ${data} failed`);

            return await this.commit(op);
        } catch (ex) {
            return await this.abort(op);
        }
    }

    private async execTransfer(params: ITransferParams, op: IOp) {
        this.log.verbose("exec transfer start");
        try {

            const {from, to, memo} = params;
            sNotEqual(from, to, () => `transfer error : the from_account '${from}' cannot be equal to to_account '${to}'`);

            const nftd = await NftModel.findOne({_id: op.nft_id});
            ok(nftd, () => `transfer error : nft<${op.nft_id}> is not exist`);
            sEqual(nftd!.owner_id, from, () => `transfer error : nft<${op.nft_id}> is not belong to ${from}, but ${nftd!.owner_id}`);

            /** write operations
             * 1. create operation
             * 2. update nft
             */
            const ret = await NftModel.findOneAndUpdate({_id: nftd!._id}, {$set: {owner_id: to}});
            ok(ret, () => `transfer error : set nft<${op.nft_id}>'s owner to ${to} failed`);

            return await this.commit(op);
        }

        catch (ex) {
            return await
                this.abort(op);
        }

    }
}
