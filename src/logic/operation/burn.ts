import {Operation, retError, retNft} from "./base";
import {IOp, NftModel, NftTerminatedModel} from "../model";
import {IBurnParams, OpCode, OpError} from "./constant";
import {Logger} from "winston";
import {Service} from "typedi";
import {genLogger} from "@khgame/turtle/lib";

@Service()
export class OpBurn extends Operation<IBurnParams> {

    log: Logger = genLogger("op:burn");

    get opCode(): OpCode {
        return OpCode.BURN;
    }

    async validate(creator: string, nftId: string, params: IBurnParams): Promise<OpError> {
        const nft = await NftModel.findOne({_id: nftId});
        if (!nft) {
            return OpError.NFT_NOT_ALIVE;
        }
        if (nft.holder && nft.holder !== creator) {
            return OpError.NFT_ARE_HOLD_BY_OTHER_SERVICE;
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
            return {error: OpError.BURN_DB_CREATE_TERMINATED_NFT_FAILED};
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
