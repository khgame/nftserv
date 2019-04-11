import {
    BaseEntity, Column, CreateDateColumn, Entity, ObjectID, ObjectIdColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm";


@Entity("update_record")
export class updateRecordEntity extends BaseEntity { // todo

    @ObjectIdColumn()
    public id: ObjectID;

    @Column()
    public nft_id: ObjectID;

    @Column()
    public operation: string;

    @CreateDateColumn()
    public created_at: Date;

    constructor(nft_id: string) {
        super();
        this.nft_id = new ObjectID(nft_id);
    }
}
