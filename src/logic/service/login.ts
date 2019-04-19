import {Global} from "../../global";
import {http} from "./rpc";
import {forCondition} from "kht";

export const waitForLoginSvrAlive = async () => {
    return await forCondition(async () => {
        try {
            return !!await getLoginSvrInfo();
        }catch (e) {
            return false;
        }
    });
};

export const getLoginSvrInfo = async () => {
    const conf = Global.conf.rpc.login;
    const ret = await http().get(`${conf.host}${conf.root}${conf.api.info}`).then((rsp) => {
        if (rsp.status !== 200) {
            throw new Error("validator response status error");
        }
        return rsp.data;
    }).catch((ex: { message: string; }) => {
        throw new Error("login svr error => " + ex.message);
    });
    return ret;
};

export const getOnlineState = async (sessionId: string) => {
    // console.log("req");
    const conf = Global.conf.rpc.login;
    return await http().get(`${conf.host}${conf.root}${conf.api.online_state}/${sessionId}`)
        .then((rsp) => {
            if (rsp.status !== 200) {
                throw new Error("login svr response status error");
            }
            return rsp.data;
        })
        .catch(ex => {
            throw new Error("login svr error => " + ex.message);
        });
};

export const getGameServers = async () => {
    // console.log("req");
    const conf = Global.conf.rpc.login;
    return await http().get(`${conf.host}${conf.root}${conf.api.game_svr_list}`)
        .then((rsp) => {
            if (rsp.status !== 200) {
                throw new Error("login svr response status error");
            }
            return rsp.data;
        })
        .catch(ex => {
            throw new Error("login svr error => " + ex.message);
        });
};
