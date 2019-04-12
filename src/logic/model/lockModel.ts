import * as mongoose from "mongoose";
import {Document, Schema} from "mongoose";
import {ObjectID} from "bson";

export enum LockStatus {
    INITIALED = 0,
    PREPARED = 1,
    COMMITTED = 2,

    FINISHED_STATES = 10,

    TIMEOUT = 11,
    ABORTED = 12,

    RELEASED = 21
}

export interface ILock extends Document {

    /**
     * nft id
     */
    nft_id: ObjectID;

    /**
     * status of the lock
     */
    state: LockStatus;

    /**
     * owner_id of the locker
     */
    locker: string;

    /**
     * create time
     */
    created_at: Date;

    /**
     * update time
     */
    update_at: Date;

}

const LockSchema = new Schema({
    nft_id: {type: ObjectID, required: true},
    locker: {type: String, required: true, default: ""},
    state: {type: String, required: true, default: LockStatus.INITIALED},
    created_at: {type: Date}, // 买单生成时间
    update_at: {type: Date}, // 买单生成时间
});

LockSchema.pre("save", function (next) {
    const doc = this as ILock;
    if (doc.isNew) {
        doc.created_at = doc.created_at || new Date();
    }
    doc.update_at = new Date();
    next();
});

export const LockModel = mongoose.model<ILock>(
    "lock", LockSchema);
export const LockTerminatedModel = mongoose.model<ILock>(
    "lock_terminated", LockSchema);

