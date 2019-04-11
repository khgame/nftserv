import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {Context} from "koa";
import {AdminService} from "../../logic/admin";
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
