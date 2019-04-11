import {API} from "../decorators";
import {Get, Param} from "routing-controllers";
import {NftService} from "../../logic/nft";

@API("/nft")
export class NftController {

    constructor(public readonly nftService: NftService) {
    }

    @Get("/list/:uid")
    public async list(@Param("uid") uid: string) {
        // console.log("uid call list", uid);
        return await this.nftService.list(uid);
    }

    @Get("/info/:nft_id")
    public async info(@Param("nft_id") nftId: string) {
        return await this.nftService.get(nftId);
    }

}
