import * as Koa from "koa";
import "reflect-metadata";

import {Action, useContainer, useKoaServer} from "routing-controllers";
import {Container} from "typedi";

import * as controllers from "./controllers/index";

import {useMiddlewares} from "./middlewares";
import {createServer, Server} from "http";
import {Logger} from "winston";
import {forCondition, forMs} from "kht/lib";
import {APIRunningState, genLogger, IApi} from "@khgame/turtle/lib";
import {getGameServers, getOnlineState} from "../service/login";
import {Context} from "koa";

const objectToArray = (dict: any): any[] =>
    Object.keys(dict).map((name) => dict[name]);

export class ApiApplication implements IApi {

    private api: Koa;
    public server: Server;
    public log: Logger = genLogger("api:api");
    public apiSlowLog: Logger = genLogger("api:slow-log");

    public enabled: boolean = true;
    public runningRequest: number = 0;

    public runningState: APIRunningState = APIRunningState.NONE;

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
            } else if (timeCost > 2000) {
                this.apiSlowLog.warn(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            } else if (timeCost > 1000) {
                this.apiSlowLog.info(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            } else if (timeCost > 300) {
                this.apiSlowLog.debug(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            } else if (timeCost > 100) {
                this.apiSlowLog.verbose(`${ctx.request.originalUrl}, cost ${timeCost}ms`);
            }
        });

        this.api.use(async (ctx: Context, next: (...args: any[]) => any) => {
            this.runningRequest += 1;
            try {
                if (this.enabled) {
                    await next();
                } else {
                    ctx.status = 403;
                }
            } catch (error) {
                ctx.status = 200;
                const msgCode = Number(error.message || error);
                ctx.body = {
                    statusCode: error.statusCode || 500,
                    message: isNaN(msgCode) ? (error.message || error) : msgCode,
                };
                this.log.error(error);
            }
            this.runningRequest -= 1;
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

    public async start(port: number) {
        this.log.info(`※※ Starting Process ※※ ${port}`);
        console.log(port);
        this.runningState = APIRunningState.STARTING;
        try {
            await this.listen(port);
            this.runningState = APIRunningState.RUNNING;
            this.log.info(`※※ All Process Started ※※`);
            return true;
        } catch (e) {
            this.runningState = APIRunningState.PREPARED;
            return false;
        }
    }

    public async listen(port: number) {
        await new Promise((resolve, reject) => /** this.server.listen(port, resolve) */ this.server.listen(port, resolve));
        this.log.info(`\t- Koa server has started ✓ : running with: http://127.0.0.1:${port}. `);
    }

    public async close() {
        this.log.info("※※ start shutdown application ※※");
        this.runningState = APIRunningState.CLOSING;
        try {
            this.enabled = false;
            this.log.info("- abort all new requests ✓");

            await forCondition(() => this.runningRequest <= 0, 100);
            this.log.info("- check until no api request ✓");

            // waiting for service stop
            // await forMs(1000);
            // this.log.info("\tclose services ✓");

            this.server.close();
            this.log.info("- close server ✓");
            this.log.info("※※ application exited ※※");
            this.log.close();
            this.runningState = APIRunningState.CLOSED;
            return true;
        } catch (e) {
            this.log.error(`※※ shutdown application failed ※※ ${e}`);
            this.runningState = APIRunningState.RUNNING;
            return false;
        }
    }
}
