import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {NftService} from "../../logic/nft";
import {Context} from "koa";

@API("/nft")
export class NftController {

    constructor(public readonly nftService: NftService) {
    }

    @Get("/list/:uid")
    public async list(@Param("uid") uid: string) {
        // console.log("uid call list", uid);
        return await this.nftService.list(uid);
    }

    @Get("/get/:nft_id")
    public async info(@Param("nft_id") nftId: string) {
        return await this.nftService.get(nftId);
    }

    @Post("/issue")
    @Authorized(["SERVICE", "GM"])
    public async issue(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            nft_id: string
            uid: string
            data: string
            logic_mark: string
        }) {
        ctx.assert.ok(sid, "invalid user");
        return await this.nftService.issue(body.nft_id, sid, body.data, body.logic_mark);
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
        return this.nftService.burn(body.nft_id); // mock todo
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
        return await this.nftService.update(sid, body.nft_id, body.data);
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
        return await this.nftService.transfer(sid, body.from, body.to, body.nft_id, body.memo);
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
