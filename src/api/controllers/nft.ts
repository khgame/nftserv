import {API} from "../decorators";
import {Get, Param} from "routing-controllers";
import {NftService} from "../../logic/nft";

@API("/nft")
export class NftController {

    constructor(public readonly nftService: NftService) {
    }

    @Get("/list/:user_id")
    public async list(@Param("user_id") userId: string) {
        console.log("userId", userId);
        return await this.nftService.list(userId);
    }

    @Get("/info/:nft_id")
    public async info(@Param("nft_id") nftId: string) {
        return await this.nftService.get(nftId);
    }

}
