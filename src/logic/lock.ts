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

    private async saveState(lock: ILock, state: LockStatus): Promise<ILock> {
        this.assert.ok(lock,
            () => `setState error : the parameter 'lock' must be given`);
        this.assert.ok(state > LockStatus.FINISHED_STATES || state - lock.state === 1,
            () => `setState error : cannot set state from ${lock.state} to ${state}`);

        if (state < LockStatus.FINISHED_STATES) {
            const result = await LockModel.updateOne({_id: lock._id}, {state});
            this.log.info(`update lock status of lock ${lock._id}: ${lock.state} => ${state}`);
            this.assert.sEqual(result.nModified, 1, () => `saveState error : lock<${lock._id}> status update failed`);
            let ret = await LockModel.findById(lock._id);
            this.assert.ok(ret, `setState fatal: cannot find the updated result of lock<${lock._id}>, that should be ${lock}`);
            return ret!;
        } else {
            const {_id, nft_id, locker, created_at, update_at} = lock;
            const lockT = await LockTerminatedModel.create({_id, nft_id, locker, state, created_at, update_at});
            this.assert.ok(lockT, () => `saveState error : terminated lock<${lock._id}> create failed`);

            const result = await LockModel.findByIdAndDelete({_id: lock._id});
            this.assert.ok(result, () => `saveState error : delete lock<${lock._id}> failed`);
            return lockT;
        }
    }

    private async tryTimeout(lock: ILock) {
        const now = Date.now();
        const lockTime = lock.update_at.getTime();
        if (lock.state !== LockStatus.PREPARED || now - lockTime < 5 * 60 * 1000) {
            return lock;
        }

        // time out in 5 minutes
        const createTime = lock.created_at.getTime();
        this.log.info(`timeout - lock<${lock.nft_id}> created by ${lock.locker} at ${createTime} are timeout at ${now} > lockTime<${lockTime}> + 300,000ms`);
        return await this.saveState(lock, LockStatus.TIMEOUT);
    }

    async get(nftId: string | ObjectID) {
        const lock = await LockModel.findOne({nft_id: nftId instanceof ObjectID ? nftId : ObjectID.createFromHexString(nftId)});
        if (!lock) {
            return;
        }
        return await this.tryTimeout(lock);
    }

    async assertLock(locker: string, nftId: string | ObjectID) {
        const lock = await this.get(nftId);
        this.assert.ok(!lock || lock.locker === locker,
            () => `burn error : nft<${nftId}> is locked by another locker ${lock!.locker}`);
    }

    async check(lockId: string) {
        const lock = await LockModel.findOne({_id: lockId}); // to doCommit, the RM should check that the lock's stated is COMMITTED
        if (!lock) {
            return;
        }
        return await this.tryTimeout(lock);
    }

    private async getPreparedLock(lockId: string, serverId: string) {
        let lock = await this.check(lockId);
        if (!lock) {
            throw new Error(`getPreparedLock error : lock<${lockId}> are not exist`);
        }
        if (lock.state !== LockStatus.PREPARED) {
            throw new Error(`getPreparedLock error : lock<${lockId}> error, expect PREPARED(${LockStatus.PREPARED}), got ${lock.state}`);
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
        try {
            // check if its already locked
            let lock = await this.get(nftId);
            this.assert.ok(!lock, () => `vote error : nft<${nftId}> are already locked by ${lock!.locker}`);

            // lock and set prepared
            lock = await LockModel.create({
                nft_id: ObjectID.createFromHexString(nftId),
                locker: serverId,
                state: LockStatus.PREPARED
            });

            await redisUnlock(nftId, "LockService:vote");
            return lock;
        }catch (ex) {
            await redisUnlock(nftId, "LockService:vote");
            throw ex;
        }
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

        this.assert.sEqual(lock.state, LockStatus.COMMITTED,
            () => `unlock error : nft<${nftId}> state error, expect COMMITTED(${LockStatus.COMMITTED}), got ${lock.state}`);

        this.assert.sEqual(lock.locker, serverId,
            () => `unlock error : nft<${nftId}> are not locked by another service, expect ${serverId}, got ${lock.locker}`);

        return await this.saveState(lock, LockStatus.RELEASED);
    }

}
