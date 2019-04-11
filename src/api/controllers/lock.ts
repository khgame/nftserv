/**
 * author: bagaking(kinghand@foxmail.com)
 * date: 2019-04-11T18:03:52.522Z
 *
 * roles:
 *
 * - RM: single service, ex. game server, trade service, cultivate service
 * - TM: /lock service
 *
 * lock procedure:
 *
 *  RM --> |TM/lock/vote(nft_id)| TM (TM prepared)
 *  TM .-> |return: prepared lock state| RM
 *
 *  1. all committed
 *      1. RM .-> |RM/prepare: success| RM
 *      2. RM --> |TM/lock/continue(lock_id)| TM (TM committed)
 *      3. TM .-> |return: committed lock state| RM
 *      4. RM .-> |RM/commit| RM
 *
 *  2. abort
 *      1. RM .-> |RM/prepare: failed| RM
 *      2. RM --> |TM/lock/abort(lock_id)| TM (TM committed)
 *      3. TM .-> |return: aborted lock state| RM
 *      3. RM .-> |RM/cancel| RM
 *
 *  - exception:
 *      - timeout at 1.2 or 2.2
 *          1. TM .-> |timeout| TM
 *      - timeout at 1.3
 *          1. RM --> |RM/check(lock_id)| TM
 *          2.1. TM .-> |return: committed lock state| RM ==> origin 1.3
 *          2.2. TM .-> |return: aborted lock state| RM ==> origin 2.3
 *
 */

import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {Context} from "koa";
import {LockService} from "../../logic/lock";

@API("/lock")
export class LockController {

    constructor(public readonly lockService: LockService) {
    }

    @Get("/get/:nft_id")
    public async get(@Param("nft_id") nft_id: string) {
        return await this.lockService.get(nft_id);
    }

    @Get("/check/:lock_id")
    public async check(@Param("lock_id") lock_id: string) {
        return await this.lockService.check(lock_id);
    }

    @Post("/vote")
    @Authorized(["SERVICE", "GM"])
    public async vote(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.lockService.vote(body.nft_id, sid);
    }

    @Post("/continue")
    @Authorized(["SERVICE", "GM"])
    public async continue(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            lock_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.lockService.continue(body.lock_id, sid);
    }

    @Post("/release")
    @Authorized(["SERVICE", "GM"])
    public async abort(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.lockService.release(body.nft_id, sid);
    }

}
