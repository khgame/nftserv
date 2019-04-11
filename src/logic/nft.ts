import {Service} from "typedi";
import {NftEntity} from "./entities";
import {LockEntity} from "./entities/lock";

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

    async getLock(nftId: string){
        return await LockEntity.findOne(nftId);
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
}
