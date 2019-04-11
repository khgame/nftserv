import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {Context} from "koa";
import {AdminService} from "../../logic/admin";

@API("/admin")
export class AdminController {

    constructor(public readonly adminService: AdminService) {
    }

    @Post("/lock")
    @Authorized("GAME_SERVER")
    public async lock(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
            idempotent_hash: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.adminService.lock(body.nft_id, body.idempotent_hash, sid);
    }

    @Post("/unlock")
    @Authorized("GAME_SERVER")
    public async unlock(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.adminService.unlock(body.nft_id, sid);
    }

    @Post("/transfer")
    @Authorized("GAME_SERVER")
    public async transfer(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            from: string
            to: string
            nft_id: string
            memo: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.adminService.transfer(sid, body.from, body.to, body.nft_id, body.memo);
    }

    @Post("/update")
    @Authorized("GAME_SERVER")
    public async update(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string,
            data: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.adminService.update(sid, body.nft_id, body.data);
    }

    @Post("/burn")
    @Authorized("GAME_SERVER")
    public async consume(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return this.adminService.burn(body.nft_id); // mock todo
    }

    @Post("/produce")
    @Authorized("GAME_SERVER")
    public async produce(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            uid: string
            data: string
        }) {
        ctx.assert.ok(sid, "invalid user");
        return await this.adminService.produce(sid, body.data);
    }

    @Post("/transaction")
    @Authorized("GAME_SERVER")
    public async transaction(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            actions: Array<{ op: string, args: string[] }>
        }) {
        ctx.assert.ok(sid, "invalid user");
        return {
            ok: true
        }; // mock todo
    }


}
