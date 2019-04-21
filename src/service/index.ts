import {initDB} from "./db";
import {redis} from "./redis";

export * from './db';
export * from './login';

export async function initServices(){
    redis();
    return await initDB();
}
