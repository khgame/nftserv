import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {NftService} from "../../logic/nft";
import {Context} from "koa";

@API("/nft")
export class NftController {

    constructor(public readonly nftService: NftService) {
    }

    @Get("/list/:owner_id")
    public async list(@Param("uid") uid: string) {
        // console.log("NftController : owner_id call list", owner_id);
        return await this.nftService.list(uid);
    }

    @Get("/get/:nft_id")
    public async get(@Param("nft_id") nftId: string) {
        return await this.nftService.get(nftId);
    }

    @Post("/issue")
    @Authorized(["SERVICE", "GM"])
    public async issue(
        @Ctx() ctx: Context,
        @Body() body: {
            op_id: string
            uid: string
            data: any
            logic_mark: string
        }) {
        ctx.assert.ok(body.uid, "invalid user");
        console.log("issue body", body);
        return await this.nftService.issue(body.op_id, body.uid, body.data, body.logic_mark);
    }

    @Post("/burn")
    @Authorized(["SERVICE", "GM"])
    public async burn(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            op_id: string
            nft_id: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return this.nftService.burn(sid, body.op_id, body.nft_id); // mock todo
    }

    @Post("/update")
    @Authorized(["SERVICE", "GM"])
    public async update(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            op_id: string
            nft_id: string,
            data: any
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.nftService.update(sid, body.op_id, body.nft_id, body.data);
    }

    @Post("/transfer")
    @Authorized(["SERVICE", "GM"])
    public async transfer(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            op_id: string
            from: string
            to: string
            nft_id: string
            memo: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.nftService.transfer(sid, body.op_id, body.from, body.to, body.nft_id, body.memo);
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
