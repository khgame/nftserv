import {INft, IOp, OpCode, OpStatus} from "../model/";
import {OpModel} from "../model";
import {OpError} from "./errorCode";
import {nftMutex} from "../core/mutex";

export type retError = { error: OpError };
export type retOp = { op: IOp };
export type retNft = { nft: INft };

export abstract class Operation<TParams> {

    abstract get opCode(): OpCode;

    /**
     * determine if the operation can be create
     * @param {string} creator
     * @param {string} nftId
     * @param {*} params
     * @return {Promise<boolean>}
     */
    abstract async validate(creator: string, nftId: string, params: TParams): Promise<OpError>;

    abstract async save(op: IOp, params: TParams): Promise<retError | retNft>;

    @nftMutex(1)
    async prepare(creator: string, nftId: string, params: TParams): Promise<retError | retOp> {
        let error: OpError = await this.validate(creator, nftId, params);
        if (0 !== error) {
            return {error};
        }
        const opOrg = await OpModel.findOne({nft_id: nftId});
        if (opOrg) {
            return {error: OpError.PREPARE_OP_ALREADY_EXIST};
        }
        const op = await OpModel.create({
            nft_id: nftId,
            op_code: this.opCode,
            creator: creator,
            state: OpStatus.PREPARED,
            params
        });
        if (!op) {
            return {error: OpError.PREPARE_DB_FAILED};
        }
        return {op};
    }

    async commit(opId: string): Promise<retError | retNft> {
        const opOrg = await OpModel.findById(opId);
        if (!opOrg) {
            return {error: OpError.COMMIT_OP_CANNOT_FOUND};
        }
        if (opOrg.state !== OpStatus.PREPARED) {
            return {error: OpError.COMMIT_OP_STATE_ERROR};
        }
        // todo: need transaction here
        /**
         * there no need to validate caz the nft's state will not change
         * let error: OpError = await this.validate(opOrg.creator, opOrg.nft_id.toHexString(), opOrg.params as TParams);
         */
        const op = await OpModel.findOneAndUpdate({
            _id: opId, state: OpStatus.PREPARED
        }, {
            $set: {state: OpStatus.COMMITTED}
        });
        if (!op) {
            return {error: OpError.COMMIT_DB_FAILED};
        }
        return await this.save(op, op.params as TParams);
    }

    async abort(opId: string): Promise<retError | retOp> {
        const opOrg = await OpModel.findById(opId);
        if (!opOrg) {
            return {error: OpError.ABORT_OP_CANNOT_FOUND};
        }
        if (opOrg.state !== OpStatus.PREPARED) {
            return {error: OpError.ABORT_OP_STATE_ERROR};
        }
        const op = await OpModel.findOneAndUpdate({
            _id: opId, state: OpStatus.PREPARED
        }, {
            $set: {state: OpStatus.ABORTED}
        });
        if (!op) {
            return {error: OpError.ABORT_DB_FAILED};
        }
        return {op};
    }


}
