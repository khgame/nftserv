import {Operation, retError, retNft} from "./base";
import {IOp, NftModel} from "../model";
import {IUpdateParams, OpCode, OpError} from "./constant";
import {genLogger} from "../../service/logger";
import {Logger} from "winston";
import {Service} from "typedi";

@Service()
export class OpUpdate extends Operation<IUpdateParams> {

    log: Logger = genLogger("op:update");

    get opCode(): OpCode {
        return OpCode.UPDATE;
    }

    async validate(creator: string, nftId: string, params: IUpdateParams): Promise<OpError> {
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
            {$set: {data: params.data}});
        if (!nft) {
            return {error: OpError.UPDATE_DB_FAILED};
        }
        return {nft};
    }

}
