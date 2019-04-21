import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {NftService} from "../../logic/nft";
import {Context} from "koa";
import {genLogger} from "../../service/logger";
import {OpCreatorService} from "../../logic/opCreator";

const log = genLogger("api:nft");

@API("/nft")
export class NftController {

    constructor(
        public readonly nft: NftService,
        public readonly opCreate: OpCreatorService) {
    }

    @Get("/list/:owner_id")
    public async list(@Param("owner_id") ownerId: string) {
        return await this.nft.list(ownerId);
    }

    @Get("/get/:nft_id")
    public async get(@Param("nft_id") nftId: string) {
        return await this.nft.get(nftId);
    }

    @Post("/issue")
    @Authorized(["SERVICE", "GM"])
    public async issue(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: {
            op_id: string
            owner_id: string
            data: any
            logic_mark: string
        }) {
        ctx.assert.ok(sid, "invalid server id");
        // log.verbose("issue body", body);
        return await this.opCreate
            .issue(sid, body.op_id, body.owner_id, body.data, body.logic_mark);
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
        return await this.opCreate
            .burn(sid, body.op_id, body.nft_id); // mock todo
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
        return await this.opCreate
            .update(sid, body.op_id, body.nft_id, body.data);
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
        return await this.opCreate
            .transfer(sid, body.op_id, body.nft_id, body.from, body.to, body.memo);
    }

    //
    // @Post("/transaction")
    // @Authorized(["SERVICE", "GM"])
    // public async transaction(
    //     @Ctx() ctx: Context,
    //     @CurrentUser() {sid}: { sid: string },
    //     @Body() body: {
    //         actions: Array<{ op: string, args: string[] }>
    //     }) {
    //     ctx.assert.ok(sid, "invalid user");
    //     return {
    //         ok: true
    //     }; // mock todo
    // }
}
