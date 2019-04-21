import * as mongoose from "mongoose";
import {Document, Schema} from "mongoose";
import {ObjectID} from "bson";
import {
    IBurnParams, IHoldParams,
    IIssueParams,
    IReleaseParams,
    ITransferParams,
    IUpdateParams,
    OpCode,
    OpStatus
} from "../operation";

export interface IOp extends Document {

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
    params: IIssueParams | IBurnParams | IUpdateParams | ITransferParams | IHoldParams | IReleaseParams ;

    /**
     * create time
     */
    created_at: Date;

}

const OpSchema = new Schema({
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




