import {Operation, retError, retNft} from "./base";
import {IOp, NftModel} from "../model";
import {IReleaseParams, OpCode, OpError} from "./constant";
import {genLogger} from "../../service/logger";
import {Logger} from "winston";
import {Service} from "typedi";

@Service()
export class OpRelease extends Operation<IReleaseParams> {

    log: Logger = genLogger("op:release");

    get opCode(): OpCode {
        return OpCode.RELEASE;
    }

    async validate(creator: string, nftId: string, params: IReleaseParams): Promise<OpError> {
        const nft = await NftModel.findOne({_id: nftId});
        if (!nft) {
            return OpError.NFT_NOT_ALIVE;
        }
        if (!nft.holder) {
            return OpError.RELEASE_NFT_ARE_NOT_HOLD;
        }
        if (nft.holder !== creator) {
            return OpError.NFT_ARE_HOLD_BY_OTHER_SERVICE;
        }
        return OpError.NONE;
    }

    async save(op: IOp, params: IReleaseParams): Promise<retError | retNft> {
        const nft = await NftModel.findOneAndUpdate(
            {_id: op.nft_id},
            {$set: {holder: ''}}
        );
        if (!nft) {
            return {error: OpError.RELEASE_DB_FAILED};
        }
        return {nft};
    }

}
