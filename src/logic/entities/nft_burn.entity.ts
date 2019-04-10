import {IsDefined} from "class-validator";
import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn,
} from "typeorm";
import {NftData} from "./nft.entity";

@Entity("nft_burn")
export class NftBurn extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public uid: string;

    @Column()
    @IsDefined()
    public data: any;

    @CreateDateColumn()
    public created_at: Date;

    @CreateDateColumn()
    public burn_at: Date  = new Date();

    @Column()
    public shelf_channel: string = "";

    @Column()
    public shelf_price: number = 0;

    @Column()
    public lock_by: string = "";

    constructor(nftData: NftData) {
        super();
        this.id = nftData.id;
        this.uid = nftData.uid;
        this.data = nftData.data;
        this.created_at = nftData.created_at;
        this.lock_by = nftData.lock_by;
    }
}
