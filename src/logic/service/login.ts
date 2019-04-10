import {Global} from "../../global";
import {http} from "./rpc";

export const getOnlineState = async (sessionId: string) => {
    // console.log("req");
    return await http.get(`${Global.conf.login.host}${Global.conf.login.api}/${sessionId}`)
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
