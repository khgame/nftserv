import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm";

export enum Operation {
    ISSUE,
    BURN,
    TRANSFER,
    UPDATE
}


@Entity("ops")
export class operationEntity extends BaseEntity { // todo

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public nft_id: ObjectID;

    @Column()
    public op: string;

    @CreateDateColumn()
    public created_at: Date;

    constructor(nft_id: string) {
        super();
        this.nft_id = new ObjectID(nft_id);
    }
}
