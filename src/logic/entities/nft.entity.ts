import {IsDefined} from "class-validator";
import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn,
} from "typeorm";

@Entity("nft")
export class NftEntity extends BaseEntity {

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public uid: string;

    @Column()
    @IsDefined()
    public data: any;

    @CreateDateColumn()
    public created_at: Date;

    @Column()
    public shelf_channel: string = "";

    @Column()
    public shelf_price: number = 0;

    @Column()
    public lock_by: string = "";

    constructor(uid: string, data: object) {
        super();
        this.uid = uid;
        this.data = data;
    }
}
