import {Service} from "typedi";
import {ObjectID} from 'mongodb';
import {
    IBurnParams,
    IIssueParams, INft,
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
import {Assert, genAssert} from "./service/assert";
import {LockService} from "./lock";
import {NftService} from "./nft";

@Service()
export class OpService {
    static inst: OpService;
    log: Logger = genLogger("s:op");
    assert: Assert = genAssert("s:op");

    enabled: boolean = true;

    operationInProgress: {
        issue: number
        burn: number
        update: number
        transfer: number
    } = {
        issue: 0,
        burn: 0,
        update: 0,
        transfer: 0,
    };

    get runningCounts() {
        return Object.values(this.operationInProgress).reduce((p, v) => p + v, 0);
    }

    constructor(
        public readonly nftService: NftService,
        public readonly lockService: LockService) {
        OpService.inst = this;
        this.log.debug("Service - instance created ", OpService.inst);
    } // todo: sharding

    async get(opId: string): Promise<IOp | null> {
        if (!opId || opId.length !== 24) {
            throw new Error(`get op error: opId<${opId}> must be a single String of 24 hex character`);
        }
        return await OpModel.findOne({_id: opId});
    }

    async create(
        creator: string,
        opId: string,
        nftId: ObjectID | string,
        opCode: OpCode,
        params: IIssueParams | IBurnParams | IUpdateParams | ITransferParams
    ) {
        if (!opId || opId.length !== 24) {
            throw new Error('create op error: opId must be a single String of 24 hex character');
        }
        switch (opCode) {
            case OpCode.ISSUE:
                await this.nftService.assertNftDoNotExist(nftId);
                this.assert.ok(params as IIssueParams, `op create error: params should be IIssueParams`);
                break;
            case OpCode.BURN:
                await this.lockService.assertLock(creator, opId);
                await this.nftService.assertNftAlive(nftId);
                this.assert.ok(params as IBurnParams, `op create error: params should be IBurnParams`);
                break;
            case OpCode.UPDATE:
                await this.lockService.assertLock(creator, opId);
                await this.nftService.assertNftAlive(nftId);
                this.assert.ok(params as IUpdateParams, `op create error: params should be IUpdateParams`);
                break;
            case OpCode.TRANSFER:
                await this.lockService.assertLock(creator, opId);
                await this.nftService.assertNftAlive(nftId);
                await this.assertCanTransfer(nftId, params as ITransferParams);
                this.assert.ok(params as ITransferParams, `op create error: params should be ITransferParams`);
                break;
            default:
                throw new Error(`execute op error: got invalid op code ${opCode}`);
        }

        return await OpModel.create({
            _id: opId,
            nft_id: nftId,
            op_code: opCode,
            creator: creator,
            params
        });
    }

    async exec(opId: string) {
        let op = await this.get(opId);
        this.assert.ok(op, () => `exec error : create op<${opId}> record failed`);

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
        this.log.verbose("commit - " + op._id);
        let result = await OpModel.updateOne({_id: op._id}, {state: OpStatus.SUCCESS});
        this.log.verbose("commit - update result " + JSON.stringify(result));
        this.assert.sEqual(result.nModified, 1, () => `op commit error: wrong nModified in result, expect 1, got ${result.nModified}`);

        return OpModel.findOne({_id: op._id});
    }

    private async abort(op: IOp) {
        this.log.verbose("abort - " + op._id);
        return await OpModel.updateOne({_id: op._id}, {state: OpStatus.FAILED});
    }

    private async execIssue(params: IIssueParams, op: IOp) {
        this.log.verbose("exec issue start");
        await this.nftService.assertNftDoNotExist(op.nft_id);

        try {
            this.operationInProgress.issue += 1;

            const {owner_id, logic_mark, data} = params;

            this.log.verbose("exec issue - create nft");
            let nft = await NftModel.create({_id: op.nft_id, owner_id, logic_mark, data});
            this.assert.ok(nft, `issue error : create nft failed`);

            let ret = await this.commit(op);
            this.operationInProgress.issue -= 1;
            return ret;
        } catch (ex) {
            this.operationInProgress.issue -= 1;
            return await this.abort(op);
        }
    }

    private async execBurn(params: IBurnParams, op: IOp) {
        this.log.verbose("exec burn start");
        const nft = await this.nftService.assertNftAlive(op.nft_id);

        try {
            this.operationInProgress.burn += 1;

            /** write operations
             * 1. create operation
             * 2. delete nft
             *  1. create nftT
             *  2. remove nft
             */
            this.log.verbose("burn - delete nftd");
            const {_id, owner_id, logic_mark, data, created_at, update_at} = nft!;
            const nftT = await NftTerminatedModel.create({_id, owner_id, logic_mark, data, created_at, update_at});
            this.assert.ok(nftT, () => `burn error: create terminated nft<${op.nft_id}> failed`);
            this.log.info("burn - nft_terminated created " + op.nft_id + " => " + nftT._id);

            const deleteResult = await NftModel.deleteOne({_id: op.nft_id});
            this.log.info("burn - nft removed " + op.nft_id);
            this.assert.ok(deleteResult, () => `deleteOne error: delete nft<${op.nft_id}> failed`);

            let ret = await this.commit(op);

            this.operationInProgress.burn -= 1;
            return ret;
        } catch (ex) {
            this.operationInProgress.burn -= 1;
            return await this.abort(op);
        }
    }

    private async execUpdate(params: IUpdateParams, op: IOp) {
        this.log.verbose("exec update start");
        await this.nftService.assertNftAlive(op.nft_id);

        try {
            this.operationInProgress.update += 1;
            const {data} = params;

            /** write operations
             * 1. create operation
             * 2. update nft
             */
            const nft = await NftModel.findByIdAndUpdate(op.nft_id, {$set: {data}});
            this.assert.ok(nft, () => `update error : set nft<${op.nft_id}>'s data to ${data} failed`);

            let ret = await this.commit(op);

            this.operationInProgress.update -= 1;
            return ret;
        } catch (ex) {
            this.operationInProgress.update -= 1;
            return await this.abort(op);
        }
    }


    private async execTransfer(params: ITransferParams, op: IOp) {
        this.log.verbose("exec transfer start");
        const nft = await this.assertCanTransfer(op.nft_id, params);

        try {
            this.operationInProgress.transfer += 1;
            const {to} = params;

            /** write operations
             * 1. create operation
             * 2. update nft
             */
            const ret = await NftModel.findOneAndUpdate({_id: op.nft_id}, {$set: {owner_id: to}});
            this.assert.ok(ret, () => `transfer error : set nft<${op.nft_id}>'s owner to ${to} failed`);

            this.operationInProgress.transfer -= 1;
            return await this.commit(op);
        }
        catch (ex) {
            this.operationInProgress.transfer -= 1;
            return await this.abort(op);
        }
    }

    private async assertCanTransfer(nftId: string | ObjectID, params: ITransferParams): Promise<INft> {
        const nft = await this.nftService.assertNftAlive(nftId);
        const {from, to} = params;
        this.assert.sNotEqual(from, to, () => `assert can transfer error : the from '${from}' cannot be equal to to '${to}'`);
        this.assert.sEqual(nft.owner_id, from, () => `transfer error : nft<${nftId}> is not belong to ${from}, but ${nft.owner_id}`);
        return nft;
    }
}
