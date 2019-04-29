import {API} from "../../decorators";
import {Get, Param} from "routing-controllers";
import {NftService} from "../../../logic/nft";
import {genLogger} from "../../../service/logger";

@API("/nft/info")
export class NftInfoController {

    log = genLogger("api:nft:info");

    constructor(public readonly nft: NftService) {
    }

    @Get("/list/:owner_id")
    public async list(@Param("owner_id") ownerId: string) {
        return await this.nft.list(ownerId);
    }

    @Get("/get/:nft_id")
    public async get(@Param("nft_id") nftId: string) {
        return await this.nft.get(nftId);
    }
}