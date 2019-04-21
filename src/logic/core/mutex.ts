import {redisLock, redisUnlock} from "../service/redis";

export function nftMutex(index: number) {
    return (target: Object,
            methodName: string,
            descriptor: TypedPropertyDescriptor<(...args: any[]) => any>) => {

        let originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const nftId = args[index];
            const mutexSign = "NftService:" + methodName;
            const mutex = await redisLock(nftId, mutexSign);
            if (!mutex) {
                throw new Error(`${methodName} error : get mutex of nft<${args[index]}> failed`);
            }
            let ret;
            try{
                ret = originalMethod!.apply(this, args);
                await redisUnlock(nftId, mutexSign);
                return ret;
            } catch (ex) {
                await redisUnlock(nftId, mutexSign);
                throw ex;
            }
        };
        return descriptor;
    };
}
