import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity, Index,
    PrimaryColumn
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

    @PrimaryColumn()
    public id: ObjectID;

    @Index()
    @Column()
    public nft_id: ObjectID;

    @Index()
    @Column({
        type: "enum",
        enum: OperationCode,
        default: OperationCode.NONE
    })
    public opCode: OperationCode;

    @Column()
    public params: any;

    @CreateDateColumn()
    public created_at: Date;

    constructor(opId: string, nftId: ObjectID, opCode: OperationCode, params: any) {
        super();
        this.id = new ObjectID(opId);
        this.nft_id = nftId;
        this.opCode = opCode;
        this.params = params;
    }
}
