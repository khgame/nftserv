import {Service} from "typedi";
import {NftBurnEntity, NftEntity} from "./entities";
import {redisLock, redisUnlock} from "./service/redis";

@Service()
export class NftService {
    static inst: NftService;

    constructor() {
        NftService.inst = this;
        console.log("Service: instance created ", NftService.inst);
    }

    async list(uid: string) {
        const nftds = await NftEntity.find({uid});
        return nftds;
    }

    async get(nftId: string) {
        if (!nftId) {
            throw new Error('get info error: nftId connot be empty');
        }
        const nftd = await NftEntity.findOne(nftId); // todo: timeout logic
        if (!nftd) {
            throw new Error(`get info error: nft<${nftId}> dose not exist`);
        }
        return nftd;
    }

    async issue(uid: string, data: any, logic_mark: string = "") {
        const nftd = new NftEntity(uid, data, logic_mark);
        return await nftd.save();
    }

    async burn(nftId: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
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

    async transfer(serverId: string, from: string, to: string, nftId: string, memo: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
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

        if (info.uid !== from) {
            await redisUnlock(nftId, "");
            throw new Error(`transfer error : nft<${nftId}> is not belong to ${from}, but ${info.uid}`);
        }

        if (from === to) {
            await redisUnlock(nftId, "");
            throw new Error(`transfer error : the from_account ${from} cannot be equal to to_account${to}`);
        }

        info.uid = to;
        // todo: record

        const ret = await info.save();
        await redisUnlock(nftId, "");
        return ret;
    }

    async update(serverId: string, nftId: string, data: any) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
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
