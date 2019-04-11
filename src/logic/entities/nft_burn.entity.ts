import {IsDefined} from "class-validator";
import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn,
} from "typeorm";
import {NftEntity} from "./nft.entity";

@Entity("nft_burn")
export class NftBurnEntity extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public uid: string;

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

    @Column()
    public lock_by: string = "";

    constructor(nftData: NftEntity) {
        super();
        this.id = nftData.id;
        this.uid = nftData.uid;
        this.data = nftData.data;
        this.created_at = nftData.created_at;
        this.lock_by = nftData.lock_by;
    }
}
