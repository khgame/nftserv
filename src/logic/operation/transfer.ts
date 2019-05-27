import {Operation, retError, retNft} from "./base";
import {IOp, NftModel} from "../model";
import {ITransferParams, OpCode, OpError} from "./constant";
import {Logger} from "winston";
import {Service} from "typedi";
import {genLogger} from "@khgame/turtle/lib";

@Service()
export class OpTransfer extends Operation<ITransferParams> {

    log: Logger = genLogger("op:transfer");

    get opCode(): OpCode {
        return OpCode.TRANSFER;
    }

    async validate(creator: string, nftId: string, params: ITransferParams): Promise<OpError> {
        const {from, to} = params;
        if (to === from) {
            return OpError.TRANSFER_CANNOT_TRANSFER_NFT_TO_ITS_OWNER;
        }
        const nft = await NftModel.findOne({_id: nftId});
        if (!nft) {
            return OpError.NFT_NOT_ALIVE;
        }
        if (nft.holder && nft.holder !== creator) {
            return OpError.NFT_ARE_HOLD_BY_OTHER_SERVICE;
        }
        if (nft.owner_id !== from) {
            return OpError.TRANSFER_NFT_ARE_NOT_BELONG_TO_THE_USER;
        }
        return OpError.NONE;
    }

    async save(op: IOp, params: ITransferParams): Promise<retError | retNft> {
        const nft = await NftModel.findOneAndUpdate(
            {_id: op.nft_id},
            {$set: {owner_id: params.to}}
            );
        if (!nft) {
            return {error: OpError.TRANSFER_DB_FAILED};
        }
        return {nft};
    }

}
