import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    Index,
    ObjectIdColumn,
    UpdateDateColumn,
} from "typeorm";

import {ObjectID} from 'mongodb';
export enum LockStatus {
    INITIALED = 0,
    PREPARED = 1,
    COMMITTED = 2,

    FINISHED_STATES = 10,

    TIMEOUT = 11,
    ABORTED = 12,

    RELEASED = 21
}

@Entity("lock")
export class LockEntity extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Index()
    @Column()
    public nft_id: ObjectID; // todo: indexing

    @Column({
        type: "enum",
        enum: LockStatus,
        default: LockStatus.INITIALED
    })
    public state: LockStatus;

    @Column()
    public locker: string = "";

    @CreateDateColumn()
    public created_at: Date;

    @UpdateDateColumn()
    public update_at: Date;

    constructor(nft_id: ObjectID, locker: string) {
        super();
        this.nft_id = nft_id;
        this.locker = locker;
    }

    async saveState(state: LockStatus) {
        if (state < LockStatus.FINISHED_STATES && state - this.state !== 1) {
            throw new Error(`lockEntity setState error: cannot set state from ${this.state} to state`);
        }
        this.state = state;
        if (this.state < LockStatus.FINISHED_STATES) {
            return await this.save();
        } else {
            const lockFinished = LockFinishedEntity.createFinishedLock(this);
            const ret = await lockFinished.save();
            await this.remove();
            return ret;
        }
    }
}

@Entity("lock_finished")
export class LockFinishedEntity extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Index()
    @Column()
    public nft_id: string;

    @Column()
    public locker: string = "";

    @Column()
    public state: LockStatus = LockStatus.FINISHED_STATES;

    @Column()
    public created_at: Date;

    @CreateDateColumn()
    public finished_at: Date;

    constructor() {
        super();
    }

    static createFinishedLock(lock: LockEntity){
        const ret = new LockFinishedEntity();
        ret.id = lock.id;
        ret.locker = lock.locker;
        ret.state = lock.state;
        ret.created_at = lock.created_at;
        return ret;
    }
}
