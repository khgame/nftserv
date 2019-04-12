import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ObjectID,
    PrimaryColumn
} from "typeorm";

export enum OperationCode {
    ISSUE,
    BURN,
    TRANSFER,
    UPDATE
}


@Entity("ops")
export class OperationEntity extends BaseEntity { // todo

    @PrimaryColumn()
    public id: ObjectID;

    @Column()
    public nft_id: ObjectID;

    @Column()
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
