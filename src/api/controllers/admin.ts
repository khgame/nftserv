import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {Context} from "koa";
import {AdminService} from "../../logic/admin";

@API("/admin")
export class AdminController {

    constructor(public readonly adminService: AdminService) {
    }

    @Post("/issue")
    @Authorized(["SERVICE", "GM"])
    public async issue(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            uid: string
            data: string
            logic_mark: string
        }) {
        ctx.assert.ok(sid, "invalid user");
        return await this.adminService.issue(sid, body.data, body.logic_mark);
    }

    @Post("/burn")
    @Authorized(["SERVICE", "GM"])
    public async consume(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return this.adminService.burn(body.nft_id); // mock todo
    }

    @Post("/update")
    @Authorized(["SERVICE", "GM"])
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

    @Post("/transfer")
    @Authorized(["SERVICE", "GM"])
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

    @Post("/transaction")
    @Authorized(["SERVICE", "GM"])
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
