import * as Koa from "koa";
import * as bodyParser from "koa-bodyparser";
import * as logger from "koa-logger";
import {Global} from "../global";

async function catchError(ctx: Koa.Context, next: Function) {
    Global.runningRequest += 1;
    try {
        if (Global.enabled) {
            await next();
        }else {
            ctx.status = 403;
        }
    } catch (error) {
        ctx.status = 200;
        const msgCode = Number(error.message || error);

        ctx.body = {
            statusCode: error.statusCode || 500,
            message: isNaN(msgCode) ? (error.message || error) : msgCode,
        };
    }
    Global.runningRequest -= 1;
}

const apply: { [key: string]: () => Koa.Middleware[] } = {
    ["production"]: () => [
        catchError,
        bodyParser()
    ],
    ["development"]: () => [
        catchError,
        bodyParser(),
        logger(),
    ]
};

export const useMiddlewares = (app: Koa, applyGroup: string): Koa => {
    return apply[applyGroup]().reduce((_, m) => {
        _.use(m);
        return _;
    }, app);
};
