import {Service} from "typedi";
import {redisLock, redisUnlock} from "./service/redis";
import {ObjectID} from "mongodb";
import {ILock, LockModel, LockStatus, LockTerminatedModel} from "./model";
import {genLogger} from "./service/logger";
import {Logger} from "winston";
import {Assert, genAssert} from "./service/assert";

@Service()
export class LockService {
    static inst: LockService;
    private log: Logger = genLogger("s:lock");
    private assert: Assert = genAssert("s:lock");

    constructor() {
        LockService.inst = this;
        this.log.debug("Service - instance created ", LockService.inst);
    }

    private async saveState(lock: ILock, state: LockStatus) {
        if (state < LockStatus.FINISHED_STATES && state - lock.state !== 1) {
            throw new Error(`lockEntity setState error: cannot set state from ${lock.state} to state`);
        }
        lock.state = state;
        if (lock.state < LockStatus.FINISHED_STATES) {
            const ret = await LockTerminatedModel.updateOne({_id: lock._id}, {state});
            if (!ret) {
                throw new Error(`saveState error : lock<${lock._id}> status update failed`);
            }
        } else {
            const {_id, nft_id, locker, created_at, update_at} = lock;
            const lockT = await LockTerminatedModel.create({_id, nft_id, locker, state, created_at, update_at});
            if (!lockT) {
                throw new Error(`saveState error : terminated lock<${lock._id}> create failed`);
            }
            const ret = await LockModel.deleteOne({_id: lock._id});
            if (!ret) {
                throw new Error(`saveState error : delete lock<${lock._id}> failed`);
            }
            return lockT;
        }
    }

    async get(nftId: string | ObjectID) {
        const lock = await LockModel.findOne({nft_id: nftId instanceof ObjectID ? nftId : ObjectID.createFromHexString(nftId)});
        if (lock && lock.state === LockStatus.PREPARED && Date.now() - lock.update_at.getTime() > 5 * 60 * 1000) { // time out in 5 minutes
            await this.saveState(lock, LockStatus.TIMEOUT);
            return;
        }
        return lock;
    }

    async assertLock(locker: string, nftId: string | ObjectID) {
        const lock = await this.get(nftId);
        this.assert.ok(!lock || lock.locker === locker,
            () => `burn error : nft<${nftId}> is locked by another locker ${lock!.locker}`);
    }

    async check(lockId: string) {
        return await LockModel.findOne({_id: lockId}); // to doCommit, the RM should check that the lock's stated is COMMITTED
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
            throw new Error(`getPreparedLock error : lock<${lockId}>.locker error, expect ${serverId}, got ${lock.locker}`);
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
        lock = await LockModel.create({nft_id: ObjectID.createFromHexString(nftId), locker: serverId});
        const ret = await this.saveState(lock, LockStatus.PREPARED);

        // remove mutex
        await redisUnlock(nftId, "LockService:vote");
        return ret;
    }

    async continue(lockId: string, serverId: string) { // logic are prepared
        const lock = await this.getPreparedLock(lockId, serverId);
        return await this.saveState(lock, LockStatus.COMMITTED); // to doCommit, the RM should check that the lock's stated is COMMITTED
    }

    async abort(lockId: string, serverId: string) {
        const lock = await this.getPreparedLock(lockId, serverId);
        return await this.saveState(lock, LockStatus.ABORTED);
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

        return await this.saveState(lock, LockStatus.RELEASED);
    }

}
