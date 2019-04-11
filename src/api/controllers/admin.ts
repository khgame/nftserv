import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {NftService} from "../../logic/nft";
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
        @CurrentUser() id: { uid: string, sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(id.sid, "invalid server id");
        return await this.adminService.lock(id.sid, body.nft_id);
    }

    @Post("/unlock")
    @Authorized("GAME_SERVER")
    public async unlock(
        @Ctx() ctx: Context,
        @CurrentUser() id: { uid: string, sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(id.sid, "invalid server id");
        return await this.adminService.unlock(id.sid, body.nft_id);
    }

    @Post("/transfer")
    @Authorized("GAME_SERVER")
    public async transfer(
        @Ctx() ctx: Context,
        @CurrentUser() id: { uid: string, sid: string },
        @Body() body: {
            from: string
            to: string
            nft_id: string
            memo: string
        }) {
        ctx.assert.ok(id.sid, "invalid server id");
        return await this.adminService.transfer(id.sid, body.from, body.to, body.nft_id, body.memo);
    }

    @Post("/update")
    @Authorized("GAME_SERVER")
    public async update(@Body() body: {
        server_id: string,
        nft_id: string,
        data: string
    }) {
        return await this.adminService.update(body.server_id, body.nft_id, body.data);
    }

    @Post("/consume")
    @Authorized("GAME_SERVER")
    public async consume(@Ctx() ctx: Context,
                         @Body() body: {
                             nft_id: string
                         }) {
        return this.adminService.burn(body.nft_id); // mock todo
    }

    @Post("/produce")
    @Authorized("GAME_SERVER")
    public async produce(@Ctx() ctx: Context,
                         @Body() body: {
                             uid: string
                             data: string
                         }) {
        ctx.assert.ok(body.uid, "invalid user");
        return await this.adminService.produce(body.uid, body.data);
    }

    @Post("/transaction")
    @Authorized("GAME_SERVER")
    public async transaction(
        @CurrentUser() userId: string,
        @Body() body: {
            actions: Array<{ op: string, args: string[] }>
        }) {
        return {
            ok: true
        }; // mock todo
    }


}
