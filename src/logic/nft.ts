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
}
