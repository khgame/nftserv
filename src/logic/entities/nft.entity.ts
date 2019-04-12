import {IsDefined} from "class-validator";
import {
    BaseEntity, Column, CreateDateColumn, Entity, Index, ObjectID, ObjectIdColumn, PrimaryColumn,
} from "typeorm";

@Entity("nft")
export class NftEntity extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Index()
    @Column()
    public uid: string;

    @Index()
    @Column()
    public logic_mark: string; // to index nfts

    @Column()
    @IsDefined()
    public data: any;

    @CreateDateColumn()
    public created_at: Date;

    @Column()
    public shelf_channel: string = "";

    @Column()
    public shelf_price: number = 0;

    constructor(data: object, logic_mark: string = "") {
        super();
        this.data = data;
        this.logic_mark = logic_mark;
    }
}
