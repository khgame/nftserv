import {IsDefined} from "class-validator";
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    EntityManager,
    Index,
    ObjectIdColumn,
    PrimaryColumn,
    Transaction, TransactionManager,
} from "typeorm";
import {redisUnlock} from "../service/redis";
import {OperationEntity} from "./operation.entity";
import {ObjectID} from 'mongodb';
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
    //
    // @Column()
    // public shelf_channel: string = "";
    //
    // @Column()
    // public shelf_price: number = 0;

    constructor(data: object, logic_mark: string = "") {
        super();
        this.data = data;
        this.logic_mark = logic_mark;
    }

    async burn() {
        const burn = NftBurnEntity.createNftBurnEntity(this);
        await this.remove();
        return burn.save();
    }
}

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
    public burn_at: Date = new Date();

    @Column()
    public shelf_channel: string = "";

    @Column()
    public shelf_price: number = 0;

    constructor() {
        super();
    }

    static createNftBurnEntity(nftData: NftEntity){
        let ret = new NftBurnEntity();
        ret.id = nftData.id;
        ret.uid = nftData.uid;
        ret.data = nftData.data;
        ret.created_at = nftData.created_at;
        ret.logic_mark = nftData.logic_mark;
        return ret;
    }
}
