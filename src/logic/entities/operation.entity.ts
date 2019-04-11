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
export class OperationEntity extends BaseEntity { // todo

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public nft_id: ObjectID;

    @Column()
    public op: Operation;

    @Column()
    public params: any;

    @CreateDateColumn()
    public created_at: Date;

    constructor(nft_id: string, op: Operation, params: any) {
        super();
        this.nft_id = new ObjectID(nft_id);
        this.op = op;
        this.params = params;
    }
}
