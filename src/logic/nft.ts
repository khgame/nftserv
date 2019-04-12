import {Service} from "typedi";
import {redisLock, redisUnlock} from "./service/redis";
import {OpService} from "./op";
import {LockService} from "./lock";
import {INft, NftModel, NftTerminatedModel, OpCode} from "./model";
import {genLogger} from "./service/logger";

const log = genLogger("s:nft");

@Service()
export class NftService {
    static inst: NftService;

    constructor(public readonly opService: OpService,
                public readonly lockService: LockService) {
        NftService.inst = this;
        console.log("Service: instance created ", NftService.inst);
    }

    /**
     * delete one - create nftTerminated and delete nft
     * @param {INft} nft - the nft instance to delete
     * @return {Promise<INft>} - the nftTerminated
     */
    private async deleteOne(nft: INft) {
        const nftT = await NftTerminatedModel.create(nft);
        if (!nftT) {
            throw new Error(`deleteOne error: create terminated nft<${nft._id}> failed`);
        }
        const ret = await NftModel.deleteOne({_id: nft._id});
        if (!ret) {
            throw new Error(`deleteOne error: delete nft<${nft._id}> failed`);
        }
        return nftT;
    }

    /**
     * list all nft of the owner
     * @param {string} ownerId - id of the owner. it can be the user id if the onwner is a player
     * @param {string} logicMark - key to category the id
     * @return {Promise<module:mongoose.DocumentQuery<INft[], INft> & {}>}
     */
    async list(ownerId: string, logicMark: string = "") {
        return logicMark ?
            NftModel.find({logic_mark: logicMark, owner_id: ownerId}) :
            NftModel.find({owner_id: ownerId});
    }

    /**
     * get nft instance by id
     * @param {string} nftId
     * @return {Promise<any>}
     */
    async get(nftId: string) {
        if (!nftId) {
            throw new Error('get nft error: nftId cannot be empty');
        }
        return await NftModel.findOne({_id: nftId});
    }

    /**
     * issue an nft to a user
     * @param {string} opId - should be 32 characters random hex
     * @param {string} ownerId - user identity from the login server cluster
     * @param data - any data
     * @param {string} logic_mark - can be genre or something else, for indexing
     * @return {Promise<{new:boolean, op:IOp}>}
     */
    async issue(opId: string, ownerId: string, data: any, logic_mark: string = "") {

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        log.verbose("issue - create nftd");
        let nftd = await NftModel.create({data, logic_mark});

        log.verbose("issue - create op");
        op = await this.opService.create(opId, nftd.id, OpCode.ISSUE, {data, logic_mark, owner_id: ownerId});
        if (!op) {
            throw new Error(`issue error : create op<${opId}> record failed`);
        }

        log.verbose("issue - set user");
        const result = await NftModel.findOneAndUpdate({_id: nftd._id}, {$set: {owner_id: ownerId}});
        if (!result) {
            throw new Error(`issue error : set owner_id<${ownerId}> to nft<${nftd._id}> failed`);
        }

        log.verbose("issue - success");
        return {new: true, op};
    }

    /**
     *
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

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        const lock = await this.lockService.get(nftId);
        if (lock && lock.locker !== serverId) {
            await redisUnlock(nftId, "NftService:update");
            throw new Error(`burn error : nft<${nftId}> is locked by another service ${lock.locker}`);
        }

        const nftd = await this.get(nftId);
        if (!nftd) {
            await redisUnlock(nftId, "NftService:update");
            throw new Error(`burn error : nft<${nftId}> is not exist`);
        }

        op = await this.opService.create(opId, nftd.id, OpCode.BURN, {nftd});
        if (!op) {
            throw new Error(`burn error : create op<${opId}> record failed`);
        }

        const burn = await this.deleteOne(nftd);
        if (!burn) {
            await redisUnlock(nftId, "NftService:update");
            throw new Error(`burn error : burn nft<${nftId}> failed`);
        }

        await redisUnlock(nftId, "");
        return {new: true, op};
    }

    async transfer(serverId: string, opId: string, nftId: string, from: string, to: string, memo: string) {
        const mutex = await redisLock(nftId, "NftService:transfer");
        if (!mutex) {
            throw new Error(`transfer error : get mutex of nft<${nftId}> failed`);
        }

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        if (from === to) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : the from_account ${from} cannot be equal to to_account${to}`);
        }

        const lock = await this.lockService.get(nftId);
        if (lock && lock.locker !== serverId) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : nft<${nftId}> is locked by another service ${lock.locker}`);
        }

        const nftd = await this.get(nftId);
        if (!nftd) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : nft<${nftId}> is not exist`);
        }

        if (nftd.owner_id !== from) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : nft<${nftId}> is not belong to ${from}, but ${nftd.owner_id}`);
        }

        op = await this.opService.create(opId, nftd.id, OpCode.TRANSFER, {from, to, memo});
        if (!op) {
            throw new Error(`transfer error : create op<${opId}> record failed`);
        }

        const setResult = await NftModel.findOneAndUpdate({_id: nftd._id}, {$set: {owner_id: to}});
        if (!setResult) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : set nft<${nftId}>'s owner to ${to} failed`);
        }

        await redisUnlock(nftId, "NftService:transfer");
        return {new: true, op};
    }

    async update(serverId: string, opId: string, nftId: string, data: any) {
        const mutex = await redisLock(nftId, "NftService:update");
        if (!mutex) {
            throw new Error(`update error : get mutex of nft<${nftId}> failed`);
        }

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        const lock = await this.lockService.get(nftId);
        if (lock && lock.locker !== serverId) {
            await redisUnlock(nftId, "NftService:update");
            throw new Error(`update error : nft<${nftId}> is locked by another service ${lock.locker}`);
        }

        const nftd = await this.get(nftId);
        if (!nftd) {
            await redisUnlock(nftId, "NftService:update");
            throw new Error(`update error : nft<${nftId}> is not exist`);
        }

        op = await this.opService.create(opId, nftd.id, OpCode.UPDATE, {data});
        if (!op) {
            throw new Error(`update error : create op<${opId}> record failed`);
        }

        const setResult = await NftModel.findOneAndUpdate({_id: nftd._id}, {$set: {data}});
        if (!setResult) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`update error : set nft<${nftId}>'s data to ${data} failed`);
        }

        await redisUnlock(nftId, "");
        return {new: true, op};
    }
}
