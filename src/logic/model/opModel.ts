import * as mongoose from "mongoose";
import {Document, Schema} from "mongoose";
import {ObjectID} from "bson";

export enum OpCode {
    NONE,
    ISSUE,
    BURN,
    UPDATE,
    TRANSFER,
}

export enum OpStatus {
    INITIALED = 0,
    SUCCESS = 2,
    FAILED = 3
}

export interface IIssueParams {
    owner_id: string;
    logic_mark: string;
    data: any;
}

export interface IBurnParams {

}

export interface IUpdateParams {
    data: any;
}

export interface ITransferParams {
    from: any;
    to: any;
    memo: any;
}

export interface IOp extends Document {

    /**
     * the op_id, should be a single String of 24 hex character
     */
    _id: string;

    /**
     * nft id
     */
    nft_id: ObjectID;

    /**
     * id of service who created this operation
     */
    creator: string;

    /**
     * op code
     */
    op_code: OpCode;

    /**
     * state of this op
     */
    state: OpStatus;

    /**
     * params of this operation
     */
    params: IIssueParams | IBurnParams | IUpdateParams | ITransferParams ;

    /**
     * create time
     */
    created_at: Date;

}

const OpSchema = new Schema({
    _id: {type: String, required: true},
    nft_id: {type: ObjectID, required: true},
    creator: {type: String, required: true},
    op_code: {type: OpCode, required: true, default: OpCode.NONE},
    state: {type: OpStatus, required: true, default: OpStatus.INITIALED},
    params: {type: Object, default: {}}, // 买单生成时间
    created_at: {type: Date}, // 买单生成时间
});

OpSchema.pre("save", function (next) {
    const doc = this as IOp;
    if (doc.isNew) {
        doc.created_at = doc.created_at || new Date();
        doc.state = doc.state || OpStatus.INITIALED;
    }
    next();
});

export const OpModel = mongoose.model<IOp>(
    "op", OpSchema);
export const OpTerminatedModel = mongoose.model<IOp>(
    "op_terminated", OpSchema);




