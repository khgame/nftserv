import {ConnectionOptions, createConnection} from "typeorm";
import * as entities from "../entities";
import {Global} from "../../global";

export const initDB = async () => {
    const {host, port, database, username, password} = Global.conf.mongo;
    const options : ConnectionOptions = {
        type: "mongodb",
        host, port, database, username, password,
        useNewUrlParser: true,
        entities: Object.keys(entities).map((name) => (entities as any)[name]),
    };
    console.log("init db : ", options);
    return createConnection(options)
        .then(() => console.log("mongodb connect success"))
        .catch((error: any) => console.log(error));
};
