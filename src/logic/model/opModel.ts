import * as mongoose from "mongoose";
import {Document, Schema} from "mongoose";
import {ObjectID} from "bson";

export enum OpCode {
    NONE,
    ISSUE,
    BURN,
    TRANSFER,
    UPDATE
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
     * op code
     */
    op_code: OpCode;

    /**
     * params of this operation
     */
    params: any;

    /**
     * create time
     */
    created_at: Date;


}

const OpSchema = new Schema({
    _id: { type: String, required: true },
    nft_id: {type: ObjectID, required: true},
    op_code: {type: OpCode, required: true, default: OpCode.NONE},
    params: {type: Object, default: {}}, // 买单生成时间
    created_at: {type: Date}, // 买单生成时间
});

OpSchema.pre("save", function (next) {
    const doc = this as IOp;
    if (doc.isNew) {
        doc.created_at = doc.created_at || new Date();
    }

    next();
});

export const OpModel = mongoose.model<IOp>(
    "op", OpSchema);
export const OpTerminatedModel = mongoose.model<IOp>(
    "op_terminated", OpSchema);




