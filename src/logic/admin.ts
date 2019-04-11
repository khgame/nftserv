import {Service} from "typedi";
import {NftData} from "./entities";
import {NftBurn} from "./entities/nft_burn.entity";
import {Global} from "../global";
import {redisLock, redisUnlock} from "./service/redis";
import {NftService} from "./nft";

@Service()
export class AdminService {
    static inst: AdminService;

    constructor(public readonly nftService: NftService) {
        AdminService.inst = this;
        console.log("Service: instance created ", AdminService.inst);
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

        const nftd = await this.nftService.get(nftId);
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

    async lock(serverId: any, nftId: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.nftService.get(nftId);

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

        const info = await this.nftService.get(nftId);

        if (!info.lock_by) {
            await redisUnlock(nftId, "");
            throw new Error(`unlock error : nft<${nftId}> are not locked`);
        }

        if (info.lock_by !== serverId) {
            await redisUnlock(nftId, "");
            throw new Error(`unlock error : nft<${nftId}> are locked by another service ${info.lock_by}, not the ${serverId}`);
        }

        info.lock_by = "";
        const ret = await info.save();

        await redisUnlock(nftId, "");
        return ret;
    }

    async transfer(serverId: string, from: string, to: string, nftId: string, memo: string) {
        const lockResult = await redisLock(nftId, "");
        if (!lockResult) {
            throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
        }

        const info = await this.nftService.get(nftId);

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

        const info = await this.nftService.get(nftId);

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
