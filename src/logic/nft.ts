import {Service} from "typedi";
import {NftData} from "./entities";
import {NftBurn} from "./entities/nft_burn.entity";
import {Global} from "../global";
import {redisLock, redisUnlock} from "./service/redis";

@Service()
export class NftService {
    static inst: NftService;

    constructor() {
        NftService.inst = this;
        console.log("Service: instance created ", NftService.inst);
    }

    async list(uid: string) {
        const nftds = await NftData.find({uid});
        return nftds;
    }

    async get(nftId: string) {
        if (!nftId) {
            throw new Error('get info error: nftId connot be empty');
        }
        const nftd = await NftData.findOne(nftId);
        if (!nftd) {
            throw new Error(`get info error: nft<${nftId}> dose not exist`);
        }
        return nftd;
    }

    async produce(uid: string, data: any) {
        const nftd = new NftData(uid, data);
        return await nftd.save();
    }

    async burn(nftId: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const nftd = await this.get(nftId);
        if (nftd) {
            const burn = new NftBurn(nftd);
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

    async shelf(userId: string, nftId: string, shelfChannel: string, shelfPrice: number) {

        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.get(nftId);
        console.log('shelf', nftId, info);

        if (info.uid !== userId) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : nft<${nftId}> owner error, expected ${info.uid}, got ${userId}`);
        }

        if (info.lock_by) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : nft<${nftId}> has already been locked by ${info.lock_by}`);
        }

        if (!shelfChannel) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : shelf_channel are not exist`);
        }

        if (Global.conf.rules.shelf.channels.indexOf(shelfChannel) < 0) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : channel<${shelfChannel}> to shelf are not avaliable`);
        }

        if (info.shelf_channel && info.shelf_channel !== shelfChannel) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : nft<${nftId}> has already been shelf in channel ${info.shelf_channel}`);
        }

        if (!shelfPrice || shelfPrice < 0) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : shelf_price<${shelfPrice}> must be an positive number`);
        }

        if (info.shelf_price === shelfPrice) {
            await redisUnlock(nftId, "");
            throw new Error(`shelf error : nft<${nftId}> nothing changed`);
        }

        info.shelf_channel = shelfChannel;
        info.shelf_price = shelfPrice;
        const ret = await info.save();

        await redisUnlock(nftId, "");
        return ret;
    }

    async unshelf(userId: string, nftId: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.get(nftId);

        if (info.uid !== userId) {
            await redisUnlock(nftId, "");
            throw new Error(`unshelf error : nft<${nftId}> owner error, expected ${info.uid}, got ${userId}`);
        }
        if (!info.shelf_channel) {
            await redisUnlock(nftId, "");
            throw new Error(`unshelf error : nft<${nftId}> are not shelf in any channel`);
        }

        info.shelf_channel = "";
        info.shelf_price = 0;
        const ret = await info.save();

        await redisUnlock(nftId, "");
        return ret;
    }

    async lock(serverId: any, nftId: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.get(nftId);

        if (info.shelf_channel) {
            await redisUnlock(nftId, "");
            throw new Error(`lock error : nft<${nftId}> are on shelf in channel ${info.shelf_channel}`);
        }

        if (info.lock_by) {
            await redisUnlock(nftId, "");
            throw new Error(`lock error : nft<${nftId}> are already locked by server ${info.lock_by}`);
        }

        info.lock_by = serverId;
        const ret = await info.save();

        await redisUnlock(nftId, "");
        return ret;
    }

    async unlock(serverId: string, nftId: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.get(nftId);

        if (!info.lock_by) {
            await redisUnlock(nftId, "");
            throw new Error(`unlock error : nft<${nftId}> are not locked`);
        }

        if (info.lock_by !== serverId) {
            await redisUnlock(nftId, "");
            throw new Error(`unlock error : nft<${nftId}> are locked by another service ${info.lock_by}, not the ${serverId}`);
        }

        info.lock_by = serverId;
        const ret = await info.save();

        await redisUnlock(nftId, "");
        return ret;
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
