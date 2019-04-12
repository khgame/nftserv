// import {ConnectionOptions, createConnection} from "typeorm";
// import * as entities from "../entities";
// import {Global} from "../../global";
//
// export const initDB = async () => {
//     const {host, port, database, username, password} = Global.conf.mongo;
//     const options : ConnectionOptions = {
//         type: "mongodb",
//         host, port, database, username, password,
//         useNewUrlParser: true,
//         entities: Object.keys(entities).map((name) => (entities as any)[name]),
//     };
//     return createConnection(options)
//         .then(() => console.log("mongodb connect success with options", {host, port, database, username, password}))
//         .catch((error: any) => console.log(error));
// };

import * as mongoose from "mongoose";
import {Global} from "../../global";

export function initDB() {
    const {host, port, database, username, password} = Global.conf.mongo;
    const authStr = username ? `${username}${password ? ":" + password : ""}@` : "";
    const mongodbUrl = `mongodb://${authStr}${host}${port ? ":" + port : ""}/${database || "khgame_login_svr"}`;
    mongoose.connect(mongodbUrl, {useNewUrlParser: true});
    mongoose.connection.on("connected", (err: any) => {
        console.log("Mongoose connection open to " + mongodbUrl);
    });
    mongoose.connection.on("error", (err: any) => {
        console.log("Mongoose connection error to " + mongodbUrl);
    });
    mongoose.connection.on("disconnected", (err: any) => {
        console.log("Mongoose connection disconnected to " + mongodbUrl);
    });
    return mongoose;
}
