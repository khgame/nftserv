import {Operation, retError, retNft} from "./base";
import {IOp, NftModel, NftTerminatedModel} from "../model";
import {IIssueParams, OpCode, OpError} from "./constant";
import {Logger} from "winston";
import {Service} from "typedi";
import {genLogger} from "@khgame/turtle/lib";

@Service()
export class OpIssue extends Operation<IIssueParams> {

    log: Logger = genLogger("op:issue");

    get opCode(): OpCode {
        return OpCode.ISSUE;
    }

    async validate(creator: string, nftId: string, params: IIssueParams): Promise<OpError> {
        const nft = await NftModel.findOne({_id: nftId});
        if (nft) {
            return OpError.ISSUE_NFT_ALREADY_EXIST;
        }
        const nftT = await NftTerminatedModel.findOne({_id: nftId});
        if (nftT) {
            return OpError.ISSUE_NFT_ALREADY_TERMINATED;
        }
        return OpError.NONE;
    }

    async save(op: IOp, params: IIssueParams): Promise<retError | retNft> {
        const {owner_id, logic_mark, data} = params;
        const nft = await NftModel.create({_id: op.nft_id, owner_id, logic_mark, data});
        if (!nft) {
            return {error: OpError.ISSUE_DB_FAILED};
        }
        return {nft};
    }

}
