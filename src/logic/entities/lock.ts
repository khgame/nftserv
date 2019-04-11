import {IsDefined} from "class-validator";
import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm";

export enum LockStatus {
    PRE_COMMITTED = 0,
    COMMITTED = 1,
    TIMEOUT = 11,
    RELEASED = 12
}

@Entity("lock")
export class LockEntity extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public nft_id: ObjectID;

    @Column()
    public idempotent_hash: string;

    @Column()
    public state: LockStatus = LockStatus.COMMITTED;

    @Column()
    public locker: string = "";

    @CreateDateColumn()
    public created_at: Date;

    @UpdateDateColumn()
    public update_at: Date;

    constructor(nft_id: string, idempotent_hash: string, locker: string) {
        super();
        this.nft_id = new ObjectID(nft_id);
        this.idempotent_hash = idempotent_hash;
        this.locker = locker;

    }
}
