import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity, Index, ObjectIdColumn, PrimaryColumn, Unique,
} from "typeorm";
import {ObjectID} from 'mongodb';

export enum OperationCode {
    NONE,
    ISSUE,
    BURN,
    TRANSFER,
    UPDATE
}


@Entity("ops")
export class OperationEntity extends BaseEntity { // todo

    @ObjectIdColumn()
    public id: string;

    @Index()
    @Column('string')
    public op_id: string = "";

    @Index()
    @Column()
    public nft_id: ObjectID;

    @Index()
    @Column({
        type: "enum",
        enum: OperationCode,
        default: OperationCode.NONE
    })
    public op_code: OperationCode;

    @Column()
    public params: any;

    @CreateDateColumn()
    public created_at: Date;
}
