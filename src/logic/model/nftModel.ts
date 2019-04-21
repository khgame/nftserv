import * as mongoose from "mongoose";
import {Document, Schema} from "mongoose";

/**
 * The model of nft
 */
export interface INft extends Document {

    /**
     * owner_id id
     */
    owner_id: string;

    /**
     * logic mark for indexing
     */
    logic_mark: string;

    /**
     * data of the nft
     */
    data: any;

    /**
     * holder's identity
     */
    holder: string;

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
    owner_id: {type: String},
    logic_mark: {type: String, required: true},
    data: {type: Object, required: true},
    holder: {type: String, required: false},
    created_at: {type: Date},
    update_at: {type: Date},
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

