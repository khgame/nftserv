import {Operation, retError, retNft} from "./base";
import {IBurnParams, IIssueParams, IOp, NftModel, NftTerminatedModel, OpCode} from "../model";
import {OpError} from "./errorCode";
import {genLogger} from "../service/logger";
import {Logger} from "winston";

class OpBurn extends Operation<IBurnParams> {

    log: Logger = genLogger("op:burn");

    get opCode(): OpCode {
        return OpCode.BURN;
    }

    async validate(creator: string, nftId: string, params: IBurnParams): Promise<OpError> {
        const nft = await NftModel.findOne({_id: nftId});
        if (!nft) {
            return OpError.NFT_NOT_ALIVE;
        }
        return OpError.NONE;
    }

    async save(op: IOp, params: IBurnParams): Promise<retError | retNft> {
        const nftOrg = await NftModel.findOne({_id: op.nft_id});
        if (!nftOrg) {
            return {error: OpError.NFT_NOT_ALIVE};
        }
        const {_id, owner_id, logic_mark, data, created_at, update_at} = nftOrg;

        // todo: need transaction here
        const nftT = await NftTerminatedModel.create({
            _id, owner_id, logic_mark, data, created_at, update_at
        });
        if (!nftT) {
            return {error: OpError.BURN_DB_CREATE_NFTT_FAILED};
        }
        this.log.info("burn - nft_terminated created " + op.nft_id + " => " + nftT._id);

        const nft = await NftModel.findOneAndDelete({_id: op.nft_id});
        if (!nft) {
            return {error: OpError.BURN_DB_DESTROY_NFT_FAILED};
        }
        this.log.info("burn - nft removed " + op.nft_id);

        return {nft};
    }

}