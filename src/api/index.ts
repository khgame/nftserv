import * as Koa from "koa";
import "reflect-metadata";

import {Action, useContainer, useKoaServer} from "routing-controllers";
import {Container} from "typedi";

import * as controllers from "./controllers/index";

import {useMiddlewares} from "./middlewares";
import {createServer, Server} from "http";
import {getRedisKey, redis} from "../logic/service/redis";
import {getGameServers, getOnlineState} from "../logic/service/login";

const objectToArray = (dict: any): any[] =>
    Object.keys(dict).map((name) => dict[name]);

export class ApiApplication {
    private api: Koa;
    private server: Server;

    constructor() {
        this.api = new Koa();
        this.server = createServer(this.api.callback());
    }

    private init() {
        this.api.use(async (ctx: Koa.Context, next: Function) => {
            try {
                await next();
            } catch (error) {
                ctx.status = 200;
                const msgCode = Number(error.message || error);

                ctx.body = {
                    statusCode: error.statusCode || 500,
                    message: isNaN(msgCode) ? (error.message || error) : msgCode,
                };
            }
        });

        useMiddlewares(this.api, process.env.NODE_ENV || "development");

        this.api = useKoaServer<Koa>(this.api, {
            cors: true,
            routePrefix: "/v1",
            validation: true,
            controllers: objectToArray(controllers),
            classTransformer: false,
            currentUserChecker: async (action: Action) => {
                const server_id = action.request.headers.server_id;
                const session_id = action.request.headers.session_id;
                // console.log("session_id", session_id);
                const result: any = {sid: server_id};
                if (session_id) {
                    const onlineState = await getOnlineState(session_id);
                    if (onlineState.status === 200) {
                        console.log("onlineState", onlineState);
                        result.uid = onlineState.result.uid;
                    }
                }
                return result;
            },
            authorizationChecker: async (action: Action, roles: string[]) => {
                const server_id = action.request.headers.server_id;
                // console.log("serverId", action.request.headers, server_id);
                if (!server_id) {
                    return false;
                }

                const rsp = await getGameServers();
                if (rsp.status !== 200) {
                    return false;
                }

                const gameServers: Array<{ identity: string }> = rsp.result;
                const server = gameServers.find(v => v.identity === server_id); // this serve is exist in the game server list

                // console.log("gameServers", gameServers);
                // todo: don't use static id

                return !!server; // todo: server authority
            }

        });
        useContainer(Container);
    }

    public start(port: number): Server {
        this.init();
        return this.api.listen(port, (): void => {
            console.log(`Koa server has started, running at: http://127.0.0.1:${port}. `);
        });
    }
}
