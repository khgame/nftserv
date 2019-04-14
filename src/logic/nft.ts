import {Service} from "typedi";
import {redisLock, redisUnlock} from "./service/redis";
import {OpService} from "./op";
import {LockService} from "./lock";
import {INft, NftModel, NftTerminatedModel, OpCode} from "./model";
import {genLogger} from "./service/logger";
import {Logger} from "winston";
import {ObjectID} from "bson";
import {ok, sEqual, sNotEqual} from "./service/assert";

@Service()
export class NftService {
    static inst: NftService;
    log: Logger;

    constructor(public readonly opService: OpService,
                public readonly lockService: LockService) {
        NftService.inst = this;
        this.log = genLogger("s:nft");
        this.log.debug("Service - instance created ", NftService.inst);
    }

    /**
     * delete one - create nftTerminated and delete nft
     * @param {INft} nft - the nft instance to delete
     * @return {Promise<INft>} - the nftTerminated
     */
    private async deleteOne(nft: INft) {
        // console.log("deleteOne", nft)
        const {_id, owner_id, logic_mark, data, created_at, update_at} = nft;
        const nftT = await NftTerminatedModel.create({_id, owner_id, logic_mark, data, created_at, update_at});
        this.log.info("deleteOne - nft_terminated created " + nft._id + " => " + nftT._id);
        ok(nftT, () => `deleteOne error: create terminated nft<${nft._id}> failed`);
        const ret = await NftModel.deleteOne({_id: nft._id});
        this.log.info("deleteOne - nft removed " + nft._id);
        ok(ret, () => `deleteOne error: delete nft<${nft._id}> failed`);
        return nftT;
    }

    /**
     * list all nft of the owner
     * @param {string} ownerId - id of the owner. it can be the user id if the onwner is a player
     * @param {string} logicMark - key to category the id
     * @return {Promise<module:mongoose.DocumentQuery<INft[], INft> & {}>}
     */
    async list(ownerId: string, logicMark: string = "") {
        ok(ownerId, 'get nft error: ownerId cannot be empty');
        try {
            return logicMark ?
                NftModel.find({logic_mark: logicMark, owner_id: ownerId}) :
                NftModel.find({owner_id: ownerId});
        } catch (e) {
            this.log.warn(`get list nfts of owner<${ownerId}> error: ${e}`);
            return null;
        }
    }

    /**
     * get nft instance by id
     * @param {string} nftId
     * @return {Promise<any>}
     */
    async get(nftId: string): Promise<INft | null> { // todo: also get from the trash can ?
        ok(nftId, 'get nft error: nftId cannot be empty');
        try {
            const _id = ObjectID.createFromHexString(nftId);
            return await NftModel.findOne({_id});
        } catch (e) {
            this.log.warn(`get nft<${nftId}> error: ${e}`);
            return null;
        }

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
    async issue(serverId: string, opId: string, ownerId: string, data: any, logicMark: string = "") {

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        op = await this.opService.create(
            serverId, opId, new ObjectID(), OpCode.ISSUE,
            {
                data,
                logic_mark: logicMark,
                owner_id: ownerId
            });
        ok(op, () => `issue error : create op<${opId}> record failed`);

        this.log.verbose("issue - create nftd");
        let nftd = await NftModel.create({data, logic_mark: logicMark});
        ok(nftd, `issue error : create nftd failed`);

        /** write operations
         * 1. create operation
         * 2. create nft
         */

        this.log.verbose("issue - create op"); // todo: execute mute operation according op records. consider about revive and abort procedure.


        this.log.verbose("issue - set user");
        const result = await NftModel.findOneAndUpdate({_id: nftd._id}, {$set: {owner_id: ownerId}});
        ok(result,
            () => `issue error : set owner_id<${ownerId}> to nft<${nftd._id}> failed`);

        this.log.verbose("issue - success");
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
        const mutex = await redisLock(nftId, "NftService:burn");
        if (!mutex) {
            throw new Error(`burn error : get mutex of nft<${nftId}> failed`);
        }

        try {
            let op = await this.opService.get(opId);
            if (op) {
                await redisUnlock(nftId, "NftService:burn");
                return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
            }

            this.log.verbose("burn - check lock");
            const lock = await this.lockService.get(nftId);
            ok(!lock || lock.locker === serverId,
                () => `burn error : nft<${nftId}> is locked by another service ${lock!.locker}`);

            this.log.verbose("burn - get nftd");
            const nftd = await this.get(nftId);
            ok(nftd,
                () => `burn error : nft<${nftId}> is not exist`);

            /** write operations
             * 1. create operation
             * 2. delete nft
             *  1. create nftT
             *  2. remove nft
             */

            this.log.verbose("burn - create op record");
            op = await this.opService.create(serverId, opId, nftd!.id, OpCode.BURN, {nftd});
            ok(op,
                () => `burn error : create op<${opId}> record failed`);

            this.log.verbose("burn - delete nftd");
            const burn = await this.deleteOne(nftd!);
            ok(burn,
                () => `burn error : burn nft<${nftId}> failed`);

            await redisUnlock(nftId, "NftService:burn");
            return {new: true, op};
        } catch (ex) {
            await redisUnlock(nftId, "NftService:burn");
            throw ex;
        }
    }

    async update(serverId: string, opId: string, nftId: string, data: any) {
        const mutex = await redisLock(nftId, "NftService:update");
        if (!mutex) {
            throw new Error(`update error : get mutex of nft<${nftId}> failed`);
        }

        try {
            let op = await this.opService.get(opId);
            if (op) {
                await redisUnlock(nftId, "NftService:update");
                return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
            }

            const lock = await this.lockService.get(nftId);
            ok(!lock || lock.locker === serverId,
                () => `update error : nft<${nftId}> is locked by another service ${lock!.locker}`);

            const nftd = await this.get(nftId);
            ok(nftd,
                () => `update error : nft<${nftId}> is not exist`);

            /** write operations
             * 1. create operation
             * 2. update nft
             */

            op = await this.opService.create(serverId, opId, nftd!.id, OpCode.UPDATE, {data});
            ok(op,
                () => `update error : create op<${opId}> record failed`);

            const setResult = await NftModel.findOneAndUpdate({_id: nftd!._id}, {$set: {data}});
            ok(setResult,
                () => `update error : set nft<${nftId}>'s data to ${data} failed`);

            await redisUnlock(nftId, "NftService:update");
            return {new: true, op};
        } catch (ex) {
            await redisUnlock(nftId, "NftService:update");
            throw ex;
        }
    }

    async transfer(serverId: string, opId: string, nftId: string, from: string, to: string, memo: string) {
        const mutex = await redisLock(nftId, "NftService:transfer");
        if (!mutex) {
            throw new Error(`transfer error : get mutex of nft<${nftId}> failed`);
        }

        try {
            let op = await this.opService.get(opId);
            if (op) {
                await redisUnlock(nftId, "NftService:transfer");
                return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
            }

            sNotEqual(from, to,
                () => `transfer error : the from_account '${from}' cannot be equal to to_account '${to}'`);

            const lock = await this.lockService.get(nftId);
            ok(!lock || lock.locker === serverId,
                () => `transfer error : nft<${nftId}> is locked by another service ${lock!.locker}`);

            const nftd = await this.get(nftId);
            ok(nftd,
                () => `transfer error : nft<${nftId}> is not exist`);

            sEqual(nftd!.owner_id, from,
                () => `transfer error : nft<${nftId}> is not belong to ${from}, but ${nftd!.owner_id}`);

            /** write operations
             * 1. create operation
             * 2. update nft
             */
            op = await this.opService.create(serverId, opId, nftd!.id, OpCode.TRANSFER, {from, to, memo});
            ok(op,
                () => `transfer error : create op<${opId}> record failed`);

            const setResult = await NftModel.findOneAndUpdate({_id: nftd!._id}, {$set: {owner_id: to}});
            ok(setResult,
                () => `transfer error : set nft<${nftId}>'s owner to ${to} failed`);

            await redisUnlock(nftId, "NftService:transfer");
            return {new: true, op};
        } catch (ex) {
            await redisUnlock(nftId, "NftService:transfer");
            throw ex;
        }
    }

}
