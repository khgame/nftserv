import {Service} from "typedi";
import {redisLock, redisUnlock} from "./service/redis";
import {OpService} from "./op";
import {LockService} from "./lock";
import {OpCode} from "./model";
import {genLogger} from "./service/logger";
import {Logger} from "winston";
import {ObjectID} from "bson";
import {Assert, genAssert} from "./service/assert";

@Service()
export class OpCreatorService {
    static inst: OpCreatorService;
    log: Logger = genLogger("s:opCreate");
    assert: Assert = genAssert("s:opCreate");

    constructor(public readonly opService: OpService,
                public readonly lockService: LockService) {
        OpCreatorService.inst = this;
        this.log.debug("Service - instance created ", OpCreatorService.inst);
    }


    /**
     * issue an nft to a user
     * @param {string} serverId - id of the service
     * @param {string} opId - should be 32 characters random hex
     * @param {string} ownerId - user identity from the login server cluster
     * @param data - any data
     * @param {string} logicMark - can be genre or something else, for indexing
     * @return {Promise<{new:boolean, op:IOp}>}
     */
    async issue(serverId: string, opId: string, ownerId: string, data: any = {}, logicMark: string = "") {
        this.assert.ok(serverId, "burn error: parameter serverId must be given");
        this.assert.ok(opId, "burn error: parameter opId must be given");

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        this.log.verbose("issue - create op");
        op = await this.opService.create(
            serverId, opId, new ObjectID(), OpCode.ISSUE,
            {
                data,
                logic_mark: logicMark,
                owner_id: ownerId
            });
        this.assert.ok(op, () => `issue error : create op<${opId}> failed`);

        this.log.verbose("issue - exec op");
        op = await this.opService.exec(op._id);

        this.log.verbose("issue - created");
        return {new: true, op};
    }

    /**
     * burn the nft
     * @param {string} serverId - the locker id, generally its a server
     * @param {string} opId - operation id provided by server, is should be a single String of 24 hex character.
     * @param {string} nftId - nft id
     * @return {Promise<any>} - ret.new is true, when this operation are succeed, hence the ret.op is the operation record
     */
    async burn(serverId: string, opId: string, nftId: string) {
        this.assert.ok(serverId, "burn error: parameter serverId must be given");
        this.assert.ok(opId, "burn error: parameter opId must be given");
        this.assert.ok(nftId, "burn error: parameter nftId must be given");

        const mutex = await redisLock(nftId, "NftService:burn");
        if (!mutex) {
            throw new Error(`burn error : get mutex of nft<${nftId}> failed`);
        }

        let op = await this.opService.get(opId);
        if (op) {
            await redisUnlock(nftId, "NftService:burn");
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        try {
            this.log.verbose(`burn - create op ${opId}`);
            op = await this.opService.create(serverId, opId, nftId, OpCode.BURN, {});
            this.assert.ok(op, () => `burn error : create op<${opId}> failed`);

            this.log.verbose("burn - exec op");
            op = await this.opService.exec(op._id);

            await redisUnlock(nftId, "NftService:burn");
            return {new: true, op};
        } catch (ex) {
            await redisUnlock(nftId, "NftService:burn");
            throw ex;
        }
    }

    // @mutexMethod()
    async update(serverId: string, opId: string, nftId: string, data: any) {
        this.assert.ok(serverId, "update error: parameter serverId must be given");
        this.assert.ok(opId, "update error: parameter opId must be given");
        this.assert.ok(nftId, "update error: parameter nftId must be given");

        const mutex = await redisLock(nftId, "NftService:update");
        if (!mutex) {
            throw new Error(`update error : get mutex of nft<${nftId}> failed`);
        }

        let op = await this.opService.get(opId);
        if (op) {
            await redisUnlock(nftId, "NftService:update");
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        try {
            op = await this.opService.create(serverId, opId, nftId, OpCode.UPDATE, {data});
            this.assert.ok(op, () => `update error : create op<${opId}> record`);

            this.log.verbose("update - exec op");
            op = await this.opService.exec(op._id);

            await redisUnlock(nftId, "NftService:update");
            return {new: true, op};
        } catch (ex) {
            await redisUnlock(nftId, "NftService:update");
            throw ex;
        }
    }

    async transfer(serverId: string, opId: string, nftId: string, from: string, to: string, memo: string) {
        this.assert.ok(serverId, "transfer error: parameter serverId must be given");
        this.assert.ok(opId, "transfer error: parameter opId must be given");
        this.assert.ok(nftId, "transfer error: parameter nftId must be given");
        this.assert.ok(from, "transfer error: parameter from must be given");
        this.assert.ok(to, "transfer error: parameter to must be given");

        const mutex = await redisLock(nftId, "NftService:transfer");
        if (!mutex) {
            throw new Error(`transfer error : get mutex of nft<${nftId}> failed`);
        }

        let op = await this.opService.get(opId);
        if (op) {
            await redisUnlock(nftId, "NftService:transfer");
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        try {

            op = await this.opService.create(serverId, opId, nftId, OpCode.TRANSFER, {from, to, memo});
            this.assert.ok(op, () => `transfer error : create op<${opId}> failed`);

            this.log.verbose("transfer - exec op");
            op = await this.opService.exec(op._id);

            await redisUnlock(nftId, "NftService:transfer");
            return {new: true, op};
        } catch (ex) {
            await redisUnlock(nftId, "NftService:transfer");
            throw ex;
        }
    }

}
