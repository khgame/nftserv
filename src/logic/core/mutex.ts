import {Logger} from "winston";
import {genLogger, turtle, RedisDriver} from "@khgame/turtle/lib";

let _log: Logger;
function log() {
    if (_log) { return _log; }
    _log = genLogger("core:mutex");
    return _log;
}

export function nftMutex(index: number) {

    return (target: Object,
            methodName: string,
            descriptor: TypedPropertyDescriptor<(...args: any[]) => any>) => {

        let originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const nftId = args[index];
            const mutexSign = "NftService:" + methodName;
            const mutex = await RedisDriver.inst.dLock(nftId, mutexSign);
            if (!mutex) {
                throw new Error(`${methodName} error : get mutex of nft<${args[index]}> failed`);
            }
            log().verbose("mutex lock " + nftId + " by " + mutexSign);
            let ret;
            try {
                ret = originalMethod!.apply(this, args);
                await RedisDriver.inst.dUnlock(nftId, mutexSign);
                log().verbose("mutex unlock " + nftId + " by " + mutexSign);
                return ret;
            } catch (ex) {
                await RedisDriver.inst.dUnlock(nftId, mutexSign);
                log().verbose("mutex unlock " + nftId + " by " + mutexSign);
                throw ex;
            }
        };
        return descriptor;
    };
}
