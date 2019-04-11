import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm";

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

    @Column()
    public idempotent_hash: string;

    @Column()
    public nft_id: ObjectID;

    @Column()
    public state: LockStatus = LockStatus.INITIALED;

    @Column()
    public locker: string = "";

    @CreateDateColumn()
    public created_at: Date;

    @UpdateDateColumn()
    public update_at: Date;

    constructor(nft_id: string, locker: string) {
        super();
        this.nft_id = new ObjectID(nft_id);
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
            const lockFinished = new LockFinishedEntity(this);
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

    @Column()
    public nft_id: ObjectID;

    @Column()
    public state: LockStatus = LockStatus.FINISHED_STATES;

    @Column()
    public locker: string = "";

    @Column()
    public created_at: Date;

    @CreateDateColumn()
    public finished_at: Date;

    constructor(lock: LockEntity) {
        super();
        this.id = lock.id;
        this.locker = lock.locker;
        this.state = lock.state;
        this.created_at = lock.created_at;
    }
}
