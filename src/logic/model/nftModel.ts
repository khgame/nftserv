import * as mongoose from "mongoose";
import {Document, Schema} from "mongoose";

/**
 * The model of nft
 */
export interface INft extends Document {

    /**
     * owner id
     */
    uid: string;

    /**
     * logic mark for indexing
     */
    logic_mark: string;

    /**
     * data of the nft
     */
    data: any;

    /**
     * create time
     */
    created_at: Date;

    /**
     * update time
     */
    update_at: Date;

}

const NftSchema = new Schema({
    uid: {type: String, required: true, default: ""}, // 订单id
    logic_mark: {type: String, required: true, default: ""}, // 买家id
    data: {type: String, required: true, default: {}}, // 资源id
    created_at: {type: Date}, // 买单生成时间
    update_at: {type: Date}, // 买单生成时间
});

NftSchema.pre("save", function(next) {
    const doc = this as INft;
    if (doc.isNew) {
        doc.created_at = doc.created_at || new Date();
    }
    doc.update_at = new Date();
    next();
});

export const NftModel = mongoose.model<INft>(
    "nft", NftSchema);
export const NftTerminatedModel = mongoose.model<INft>(
    "nft_terminated", NftSchema);

