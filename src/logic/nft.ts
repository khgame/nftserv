import {Service} from "typedi";
import {INft, NftModel, NftTerminatedModel, OpCode} from "./model";
import {genLogger} from "./service/logger";
import {Logger} from "winston";
import {ObjectID} from "bson";
import {Assert, genAssert} from "./service/assert";

@Service()
export class NftService {
    static inst: NftService;
    log: Logger = genLogger("s:nft");
    assert: Assert = genAssert("s:nft");

    constructor() {
        NftService.inst = this;
        this.log.debug("Service - instance created ", NftService.inst);
    }

    // /**
    //  * delete one - create nftTerminated and delete nft
    //  * @param {INft} nft - the nft instance to delete
    //  * @return {Promise<INft>} - the nftTerminated
    //  */
    // private async deleteOne(nft: INft) {
    //     // console.log("deleteOne", nft)
    //     const {_id, owner_id, logic_mark, data, created_at, update_at} = nft;
    //     const nftT = await NftTerminatedModel.create({_id, owner_id, logic_mark, data, created_at, update_at});
    //     this.log.info("deleteOne - nft_terminated created " + nft._id + " => " + nftT._id);
    //     this.assert.ok(nftT, () => `deleteOne error: create terminated nft<${nft._id}> failed`);
    //     const ret = await NftModel.deleteOne({_id: nft._id});
    //     this.log.info("deleteOne - nft removed " + nft._id);
    //     this.assert.ok(ret, () => `deleteOne error: delete nft<${nft._id}> failed`);
    //     return nftT;
    // }

    /**
     * list all nft of the owner
     * @param {string} ownerId - id of the owner. it can be the user id if the onwner is a player
     * @param {string} logicMark - key to category the id
     * @return {Promise<module:mongoose.DocumentQuery<INft[], INft> & {}>}
     */
    async list(ownerId: string, logicMark: string = "") {
        this.assert.ok(ownerId, 'get nft error: ownerId cannot be empty');
        try {
            return logicMark ?
                NftModel.find({logic_mark: logicMark, owner_id: ownerId}) :
                NftModel.find({owner_id: ownerId});
        } catch (e) {
            this.log.warn(`get list nfts of owner<${ownerId}> error: ${e}`);
            return null;
        }
    }

    /**
     * get nft instance by id
     * @param {string} nftId
     * @return {Promise<any>}
     */
    async get(nftId: string): Promise<INft | null> { // todo: also get from the trash can ?
        this.assert.ok(nftId, 'get nft error: nftId cannot be empty');
        try {
            const _id = ObjectID.createFromHexString(nftId);
            return await NftModel.findOne({_id});
        } catch (e) {
            this.log.warn(`get nft<${nftId}> error: ${e}`);
            return null;
        }
    }

    async assertNftDoNotExist(nftId: string| ObjectID): Promise<INft>{
        const nft = await NftModel.findOne({_id: nftId});
        this.assert.ok(!nft, () => `assert nft error : nft is already exist<${nftId}>`);
        const nftT = await NftTerminatedModel.findOne({_id: nftId});
        this.assert.ok(!nftT, () => `assert nft error : burned nft is already exist<${nftId}>`);
        return nft!;
    }

    async assertNftAlive(nftId: string| ObjectID) : Promise<INft>{
        const nft = await NftModel.findOne({_id: nftId});
        this.assert.ok(nft, () => `assert nft error : cannot find nft<${nftId}>`);
        return nft!;
    }


}
