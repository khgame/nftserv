import {Service} from "typedi";
import {NftBurnEntity, NftEntity, OperationCode, OperationEntity} from "./entities";
import {redisLock, redisUnlock} from "./service/redis";
import {OperationService} from "./operation";
import {LockService} from "./lock";
import {ObjectID} from "typeorm";

@Service()
export class NftService {
    static inst: NftService;

    constructor(public readonly opService: OperationService,
                public readonly lockService: LockService) {
        NftService.inst = this;
        console.log("Service: instance created ", NftService.inst);
    }

    async list(uid: string, logic_mark: string = "") {
        const nftds = logic_mark ?
            await NftEntity.find({logic_mark, uid}) :
            await NftEntity.find({uid});
        return nftds;
    }

    async get(nftId: string) {
        if (!nftId) {
            throw new Error('get nft error: nftId cannot be empty');
        }
        const nftd = await NftEntity.findOne(nftId); // todo: timeout logic
        if (!nftd) {
            throw new Error(`get info error: nft<${nftId}> dose not exist`);
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
            return {new: false, op};
        }

        let nftd = new NftEntity(data, logic_mark);
        nftd = await nftd.save();

        return {
            new: true,
            op: await this.opService.create(opId, nftd.id, OperationCode.ISSUE, {data, logic_mark})
        };
    }

    async burn(serverId: string, opId: string, nftId: string) {
        const mutex = await redisLock(nftId, "NftService:burn");
        if (!mutex) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const nftd = await this.get(nftId);
        if (nftd) {
            const burn = new NftBurnEntity(nftd);
            const ret = await Promise.all([
                burn.save(),
                nftd.remove()
            ]);
            await redisUnlock(nftId, "");
            return ret[0];
        }
        await redisUnlock(nftId, "");
        return undefined;
    }

    async transfer(serverId: string, opId: string, nftId: string, from: string, to: string, memo: string) {
        const mutex = await redisLock(nftId, "NftService:transfer");
        if (!mutex) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        if (from === to) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : the from_account ${from} cannot be equal to to_account${to}`);
        }

        const lock = await this.lockService.get(nftId);
        if (lock && lock.locker !== serverId) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`unlock error : nft<${nftId}> is locked by another service ${lock.locker}`);
        }

        const info = await this.get(nftId);
        if (info.uid !== from) {
            await redisUnlock(nftId, "NftService:transfer");
            throw new Error(`transfer error : nft<${nftId}> is not belong to ${from}, but ${info.uid}`);
        }

        await this.opService.create(opId,
            new ObjectID(nftId),
            OperationCode.TRANSFER,
            {from, to, memo}
        );

        info.uid = to;
        const ret = await info.save();
        await redisUnlock(nftId, "NftService:transfer");
        return ret;
    }

    async update(serverId: string, opId: string, nftId: string, data: any) {
        const mutex = await redisLock(nftId, "");
        if (!mutex) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.get(nftId);

        if (info.shelf_channel) {
            await redisUnlock(nftId, "");
            throw new Error(`transfer error : nft<${nftId}> is shelf at ${info.shelf_channel}`);
        }

        if (info.lock_by !== serverId) {
            await redisUnlock(nftId, "");
            throw new Error(`unlock error : nft<${nftId}> is locked by another service ${info.lock_by}`);
        }

        info.data = data;
        // todo: record
        const ret = await info.save();
        await redisUnlock(nftId, "");
        return ret;
    }
}
