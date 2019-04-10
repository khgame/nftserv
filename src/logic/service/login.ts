import {Global} from "../../global";
import {http} from "./rpc";

export const getOnlineState = async (sessionId: string) => {
    // console.log("req");
    const conf = Global.conf.rpc.login;
    return await http().get(`${conf.host}${conf.root}${conf.api.online_state}/${sessionId}`)
        .then((rsp) => {
            if (rsp.status !== 200) {
                throw new Error("validator response status error");
            }
            return rsp.data;
        })
        .catch(ex => {
            throw new Error("validator error => " + ex.message);
        });
};

export const getGameServers = async () => {
    // console.log("req");
    const conf = Global.conf.rpc.login;
    return await http().get(`${conf.host}${conf.root}${conf.api.game_svr_list}`)
        .then((rsp) => {
            if (rsp.status !== 200) {
                throw new Error("validator response status error");
            }
            return rsp.data;
        })
        .catch(ex => {
            throw new Error("validator error => " + ex.message);
        });
};
