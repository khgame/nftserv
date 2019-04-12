import {IsDefined} from "class-validator";
import {
    BaseEntity, Column, CreateDateColumn, Entity, Index, ObjectID, ObjectIdColumn, PrimaryColumn,
} from "typeorm";
import {NftEntity} from "./nft.entity";

@Entity("nft_burn")
export class NftBurnEntity extends BaseEntity {

    @PrimaryColumn()
    public id: ObjectID;

    @Index()
    @Column()
    public uid: string;

    @Index()
    @Column()
    public logic_mark: string;

    @Column()
    @IsDefined()
    public data: any;

    @Column()
    public created_at: Date;

    @CreateDateColumn()
    public burn_at: Date  = new Date();

    @Column()
    public shelf_channel: string = "";

    @Column()
    public shelf_price: number = 0;

    constructor(nftData: NftEntity) {
        super();
        this.id = nftData.id;
        this.uid = nftData.uid;
        this.data = nftData.data;
        this.created_at = nftData.created_at;
        this.logic_mark = nftData.logic_mark;
    }
}
