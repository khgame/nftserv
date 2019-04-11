import {Service} from "typedi";
import {NftEntity} from "./entities";
import {NftBurnEntity} from "./entities/nft_burn.entity";
import {redisLock, redisUnlock} from "./service/redis";
import {NftService} from "./nft";
import {LockEntity, LockStatus} from "./entities/lock";
import {Error} from "tslint/lib/error";

@Service()
export class LockService {
    static inst: LockService;

    constructor(public readonly nftService: NftService) {
        LockService.inst = this;
        console.log("Service: instance created ", LockService.inst);
    }

    async get(nftId: string) {
        const lock = await LockEntity.findOne({nft_id: nftId});
        if (lock && lock.state === LockStatus.PREPARED) {
            // todo: time out
        }
        return lock;
    }

    async check(lockId: string) {
        return await LockEntity.findOne(lockId); // to doCommit, the RM should check that the lock's stated is COMMITTED
    }

    private async getPreparedLock(lockId: string, serverId: string) {
        let lock = await this.check(lockId);
        if (!lock) {
            throw new Error(`getPreparedLock error : lock<${lockId}> are not exist`);
        }
        if (lock.state !== LockStatus.PREPARED) {
            throw new Error(`getPreparedLock error : lock<lockId> error, expect PREPARED(${LockStatus.PREPARED}), got ${lock.state}`);
        }
        if (lock.locker !== serverId) { // check if the nft are locked by the given service
            throw new Error(`unlock error : lock<${lockId}>.locker error, expect ${serverId}, got ${lock.locker}`);
        }
        return lock;
    }

    async vote(nftId: string, serverId: string) { // and nft are locked when it's lock are voted
        // mutex for nftId
        const lockResult = await redisLock(nftId, "LockService:vote");
        if (!lockResult) {
            throw new Error(`vote error : get mutex of nft<${nftId}> failed`);
        }

        // check if its already locked
        let lock = await this.get(nftId);
        if (lock) {
            throw new Error(`vote error : nft<${nftId}> are already locked by server ${lock.locker}`);
        }

        // lock and set prepared
        lock = new LockEntity(nftId, serverId);
        const ret = await lock.saveState(LockStatus.PREPARED);

        // remove mutex
        await redisUnlock(nftId, "LockService:vote");
        return ret;
    }

    async continue(lockId: string, serverId: string) { // logic are prepared
        const lock = await this.getPreparedLock(lockId, serverId);
        return await lock.saveState(LockStatus.COMMITTED); // to doCommit, the RM should check that the lock's stated is COMMITTED
    }

    async abort(lockId: string, serverId: string) {
        const lock = await this.getPreparedLock(lockId, serverId);
        return await lock.saveState(LockStatus.ABORTED);
    }

    async release(nftId: string, serverId: string) {
        const lock = await this.get(nftId);

        if (!lock) { // return ok means that this nft are not locked
            return "ok";
        }

        if (lock.state !== LockStatus.COMMITTED) { // check if the nft are locked by the given service
            throw new Error(`unlock error : nft<${nftId}> state error, expect COMMITTED(${LockStatus.COMMITTED}), got ${lock.state}`);
        }

        if (lock.locker !== serverId) { // check if the nft are locked by the given service
            throw new Error(`unlock error : nft<${nftId}> are not locked by another service, expect ${serverId}, got ${lock.locker}`);
        }

        return await lock.saveState(LockStatus.RELEASED);
    }

}
