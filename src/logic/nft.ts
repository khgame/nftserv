import {Service} from "typedi";
import {redisLock, redisUnlock} from "./service/redis";
import {OpService} from "./operation";
import {LockService} from "./lock";
import {INft, NftModel, NftTerminatedModel, OpCode} from "./model";

@Service()
export class NftService {
    static inst: NftService;

    constructor(public readonly opService: OpService,
                public readonly lockService: LockService) {
        NftService.inst = this;
        console.log("Service: instance created ", NftService.inst);
    }

    private async deleteOne(nft: INft) {
        const ret = await NftTerminatedModel.create(nft);
        await NftModel.deleteOne({_id: nft._id}).exec;
        return ret;
    }

    async list(uid: string, logic_mark: string = "") {
        const nftds = logic_mark ?
            NftModel.find({logic_mark, uid}) :
            NftModel.find({uid});
        return nftds;
    }

    async get(nftId: string) {
        if (!nftId) {
            throw new Error('get nft error: nftId cannot be empty');
        }
        const nftd = await NftModel.findOne({_id: nftId}); // todo: timeout logic
        if (!nftd) {
            throw new Error(`get nft error: nft<${nftId}> dose not exist`);
        }
        return nftd;
    }

    /**
     * issue an nft to a user
     * @param {string} opId - should be 32 characters random hex
     * @param {string} uid - user identity from the login server cluster
     * @param data - any data
     * @param {string} logic_mark - can be genre or something else, for indexing
     * @return {Promise<BaseEntity>}
     */
    async issue(opId: string, uid: string, data: any, logic_mark: string = "") {

        let op = await this.opService.get(opId);
        if (op) {
            return {new: false, op, time_offset_ms: Date.now() - op.created_at.getTime()};
        }

        console.log("issue ==== ", opId, uid);
        let nftd = await NftModel.create({data, logic_mark});

        op = await this.opService.create(opId, nftd.id, OpCode.ISSUE, {data, logic_mark});
        if (!op) {
            throw new Error(`issue error : create op<${opId}> record failed`);
        }

        const result = await NftModel.findOneAndUpdate({_id: nftd._id}, {$set: {uid}});
        if (!result) {
            throw new Error(`issue error : set uid<${uid}> to nft<${nftd._id}> failed`);
        }

        console.log("op ==== ", op);
        return {new: true, op};
    }

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

        if (nftd.uid !== from) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : nft<${nftId}> is not belong to ${from}, but ${nftd.uid}`);
        }

        op = await this.opService.create(opId, nftd.id, OpCode.TRANSFER, {from, to, memo});
        if (!op) {
            throw new Error(`transfer error : create op<${opId}> record failed`);
        }

        const setResult = await NftModel.findOneAndUpdate({_id: nftd._id}, {$set: {uid: to}});
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
