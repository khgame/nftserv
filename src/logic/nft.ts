import {Service} from "typedi";
import {NftData} from "./entities";
import {NftBurn} from "./entities/nft_burn.entity";

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
        const nftd = await this.get(nftId);
        if (nftd) {
            const burn = new NftBurn(nftd);
            const ret = await Promise.all([
                burn.save(),
                nftd.remove()
            ]);
            return ret[0];
        }
        return undefined;
    }

    async shelf(userId: string, nftId: string, shelfChannel: string, shelfPrice: number) {

        const info = await this.get(nftId);
        // console.log('shelf', nftId, info);

        if (info.uid !== userId) {
            throw new Error(`shelf error : nft<${nftId}> owner error, expected ${info.uid}, got ${userId}`);
        }
        if (info.lock_by) {
            throw new Error(`shelf error : nft<${nftId}> has already been occupied by ${info.lock_by}`);
        }
        if (!shelfChannel) {
            throw new Error(`shelf error : shelf_channel are not exist`);
        }
        if (info.shelf_channel !== shelfChannel) {
            throw new Error(`shelf error : nft<${nftId}> is already shelf in channel ${info.shelf_channel}`);
        }
        if (!shelfPrice || shelfPrice < 0) {
            throw new Error(`shelf error : shelf_price<${shelfPrice}> must be an positive number`);
        }
        if (info.shelf_price === shelfPrice) {
            throw new Error(`shelf error : nft<${nftId}> nothing changed`);
        }

        info.shelf_channel = shelfChannel;
        info.shelf_price = shelfPrice;
        return await info.save();
    }

    async unshelf(userId: string, nftId: string) {
        const info = await this.get(nftId);

        if (info.uid !== userId) {
            throw new Error(`unshelf error : nft<${nftId}> owner error, expected ${info.uid}, got ${userId}`);
        }
        if (!info.shelf_channel) {
            throw new Error(`unshelf error : nft<${nftId}> is not shelf in any channel`);
        }

        info.shelf_channel = "";
        info.shelf_price = 0;
        return await info.save();
    }

    async lock(serverId: any, nftId: string) {
        const info = await this.get(nftId);

        if (info.shelf_channel) {
            throw new Error(`lock error : nft<${nftId}> is on shelf in channel ${info.shelf_channel}`);
        }

        if (info.lock_by) {
            throw new Error(`lock error : nft<${nftId}> is already occupied by server ${info.lock_by}`);
        }

        info.lock_by = serverId;
        return await info.save();
    }

    async unlock(serverId: string, nftId: string) {
        const info = await this.get(nftId);

        if (!info.lock_by) {
            throw new Error(`unlock error : nft<${nftId}> are not locked`);
        }

        if (info.lock_by !== serverId) {
            throw new Error(`unlock error : nft<${nftId}> are locked by another service ${info.lock_by}, not the ${serverId}`);
        }

        info.lock_by = serverId;
        return await info.save();
    }

    async transfer(serverId: string, from: string, to: string, nftId: string, memo: string) {
        const info = await this.get(nftId);

        if (info.shelf_channel) {
            throw new Error(`transfer error : nft<${nftId}> is shelf at ${info.shelf_channel}`);
        }

        if (info.lock_by !== serverId) {
            throw new Error(`unlock error : nft<${nftId}> is locked by another service ${info.lock_by}`);
        }

        if (info.uid !== from) {
            throw new Error(`transfer error : nft<${nftId}> is not belong to ${from}, but ${info.uid}`);
        }

        if (from === to) {
            throw new Error(`transfer error : the from_account ${from} cannot be equal to to_account${to}`);
        }

        info.uid = to;
        // todo: record
        return await info.save();
    }

    async update(serverId: string, nftId: string, data: any) {
        const info = await this.get(nftId);

        if (info.shelf_channel) {
            throw new Error(`transfer error : nft<${nftId}> is shelf at ${info.shelf_channel}`);
        }

        if (info.lock_by !== serverId) {
            throw new Error(`unlock error : nft<${nftId}> is locked by another service ${info.lock_by}`);
        }

        info.data = data;
        // todo: record
        return await info.save();
    }
}
