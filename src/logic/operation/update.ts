import {Operation, retError, retNft} from "./base";
import {
    IBurnParams,
    IIssueParams,
    IOp,
    ITransferParams,
    IUpdateParams,
    NftModel,
    NftTerminatedModel,
    OpCode
} from "../model";
import {OpError} from "./errorCode";
import {genLogger} from "../service/logger";
import {Logger} from "winston";

class OpBurn extends Operation<IBurnParams> {

    log: Logger = genLogger("op:update");

    get opCode(): OpCode {
        return OpCode.UPDATE;
    }

    async validate(creator: string, nftId: string, params: IUpdateParams): Promise<OpError> {
        const nft = await NftModel.findOne({_id: nftId});
        if (!nft) {
            return OpError.NFT_NOT_ALIVE;
        }
        return OpError.NONE;
    }

    async save(op: IOp, params: IUpdateParams): Promise<retError | retNft> {
        const nft = await NftModel.findOneAndUpdate({_id: op.nft_id},
            {$set: {owner_id: {data: params.data}}});
        if (!nft) {
            return {error: OpError.TRANSFER_DB_FAILED};
        }
        return {nft};
    }

}
