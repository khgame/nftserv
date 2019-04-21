import {Operation, retError, retNft} from "./base";
import {
    IHoldParams,
    IOp,
    IUpdateParams,
    NftModel,
    OpCode
} from "../model";
import {OpError} from "./constant";
import {genLogger} from "../service/logger";
import {Logger} from "winston";

export class OpHold extends Operation<IHoldParams> {

    log: Logger = genLogger("op:hold");

    get opCode(): OpCode {
        return OpCode.HOLD;
    }

    async validate(creator: string, nftId: string, params: IHoldParams): Promise<OpError> {
        const nft = await NftModel.findOne({_id: nftId});
        if (!nft) {
            return OpError.NFT_NOT_ALIVE;
        }
        if (nft.holder && nft.holder !== creator) {
            return OpError.NFT_ARE_HOLD_BY_OTHER_SERVICE;
        }
        return OpError.NONE;
    }

    async save(op: IOp, params: IUpdateParams): Promise<retError | retNft> {
        const nft = await NftModel.findOneAndUpdate(
            {_id: op.nft_id},
            {$set: {holder: op.creator}}
            );
        if (!nft) {
            return {error: OpError.HOLD_DB_FAILED};
        }
        return {nft};
    }

}
