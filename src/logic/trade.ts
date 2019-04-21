import {Service} from "typedi";
import {Global} from "../global";
import {redisLock, redisUnlock} from "../service/redis";
import {Error} from "tslint/lib/error";
import {NftService} from "./nft";

@Service() // todo: make trade an agent
export class TradeService {
    static inst: TradeService;

    constructor(public readonly nftService: NftService) {
        TradeService.inst = this;
        console.log("Service: instance created ", TradeService.inst);
    }
    //
    // async shelf(userId: string, nftId: string, shelfChannel: string, shelfPrice: number) {
    //
    //     const lockResult = await redisLock(nftId, "");
    //     if (!lockResult) {
    //         throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
    //     }
    //
    //     const info = await this.nftService.get(nftId);
    //     console.log('shelf', nftId, info);
    //
    //     if (info.owner_id !== userId) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`shelf error : nft<${nftId}> owner_id error, expected ${info.owner_id}, got ${userId}`);
    //     }
    //
    //     // if (info.lock_by) {
    //     //     await redisUnlock(nftId, "");
    //     //     throw new Error(`shelf error : nft<${nftId}> has already been locked by ${info.lock_by}`);
    //     // }
    //
    //     if (!shelfChannel) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`shelf error : shelf_channel are not exist`);
    //     }
    //
    //     if (Global.conf.rules.shelf.channels.indexOf(shelfChannel) < 0) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`shelf error : channel<${shelfChannel}> to shelf are not avaliable`);
    //     }
    //
    //     if (info.shelf_channel && info.shelf_channel !== shelfChannel) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`shelf error : nft<${nftId}> has already been shelf in channel ${info.shelf_channel}`);
    //     }
    //
    //     if (!shelfPrice || shelfPrice < 0) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`shelf error : shelf_price<${shelfPrice}> must be an positive number`);
    //     }
    //
    //     if (info.shelf_price === shelfPrice) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`shelf error : nft<${nftId}> nothing changed`);
    //     }
    //
    //     info.shelf_channel = shelfChannel;
    //     info.shelf_price = shelfPrice;
    //     const ret = await info.save();
    //
    //     await redisUnlock(nftId, "");
    //     return ret;
    // }
    //
    // async unshelf(userId: string, nftId: string) {
    //     const lockResult = await redisLock(nftId, "");
    //     if (!lockResult) {
    //         throw new Error(`shelf error : get mutex of nft<${nftId}> failed`);
    //     }
    //
    //     const info = await this.nftService.get(nftId);
    //
    //     if (info.owner_id !== userId) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`unshelf error : nft<${nftId}> owner_id error, expected ${info.owner_id}, got ${userId}`);
    //     }
    //
    //     if (!info.shelf_channel) {
    //         await redisUnlock(nftId, "");
    //         throw new Error(`unshelf error : nft<${nftId}> are not shelf in any channel`);
    //     }
    //
    //     info.shelf_channel = "";
    //     info.shelf_price = 0;
    //     const ret = await info.save();
    //
    //     await redisUnlock(nftId, "");
    //     return ret;
    // }

}
