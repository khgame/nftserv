import * as Koa from "koa";
import "reflect-metadata";

import {Action, useContainer, useKoaServer} from "routing-controllers";
import {Container} from "typedi";

import * as controllers from "./controllers/index";

import {useMiddlewares} from "./middlewares";
import {createServer, Server} from "http";
import {getGameServers, getOnlineState} from "../service";
import {genLogger} from "../service/logger";
import {Logger} from "winston";
import {Global} from "../global";
import {forCondition, forMs} from "kht/lib";

const objectToArray = (dict: any): any[] =>
    Object.keys(dict).map((name) => dict[name]);

export class ApiApplication {
    private api: Koa;
    public server: Server;
    public apiSlowLog: Logger = genLogger("api:slow-log");

    constructor() {
        this.api = new Koa();
        this.server = createServer(this.api.callback());
        this.init();
    }

    private init() {
        this.api.use(async (ctx: Koa.Context, next: Function) => {
            const startTime = Date.now();
            await next();
            const timeCost = Date.now() - startTime;

            if (timeCost > 5000) {
                this.apiSlowLog.error(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            }else if (timeCost > 2000) {
                this.apiSlowLog.warn(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            }else if (timeCost > 1000) {
                this.apiSlowLog.info(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            }else if (timeCost > 300) {
                this.apiSlowLog.debug(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            }else if (timeCost > 100) {
                this.apiSlowLog.verbose(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
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
                // console.log("request", action.request);
                const server_id = action.request.headers.server_id;
                const session_id = action.request.headers.session_id;
                const result: any = {sid: server_id};
                if (session_id) {
                    const onlineState = await getOnlineState(session_id);
                    if (onlineState.status === 200) {
                        // console.log("onlineState", onlineState);
                        result.uid = onlineState.result.uid;
                    }
                }
                return result;
            },
            authorizationChecker: async (action: Action, roles: string[]) => {
                // console.log("authorizationChecker", action.request);

                const server_id = action.request.headers.server_id;

                if (!server_id) {
                    return false;
                }

                const rsp = await getGameServers();
                if (rsp.status !== 200) {
                    return false;
                }

                const gameServers: Array<{ identity: string }> = rsp.result;
                const server = gameServers.find(v => v.identity === server_id); // this serve is exist in the game server list

                // console.log("gameServers", gameServers, server);
                // todo: don't use static id

                return !!server; // todo: server authority
            }

        });
        useContainer(Container);
    }

    public start(port: number): Server {
        return this.api.listen(port, (): void => {
            console.log(`Koa server has started, running at: http://127.0.0.1:${port}. `);
        });
    }

    public async shutdown() {
        console.log("※※ start shutdown application ※※");

        Global.enabled = false;
        console.log("\t- abort all new requests ✓");
        await forMs(1);

        await forCondition(() => Global.runningRequest <= 0, 100);
        console.log("\t- check until no api request ✓");

        // waiting for service stop
        // await forMs(1000);
        // console.log("\t- close services ✓");

        this.server.close();
        console.log("\t- close server ✓");

        await forMs(1);
        console.log("※※ application exited ※※");
    }
}
