import {API} from "../../decorators";
import {Authorized, Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {NftService} from "../../../logic/nft";
import {Context} from "koa";
import {genLogger} from "../../../logic/service/logger";
import {IHoldParams, IReleaseParams, OpHold, OpRelease} from "../../../logic/operation";

@API("/nft/release")
export class NftReleaseController {

    log = genLogger("api:nft:release");

    constructor(
        public readonly nft: NftService,
        public readonly opRelease: OpRelease) {
    }

    @Post("/prepare")
    @Authorized(["SERVICE", "GM"])
    public async prepare(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { nft_id: string, params: IReleaseParams }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opRelease.prepare(sid, body.nft_id, body.params);
    }

    @Post("/commit")
    @Authorized(["SERVICE", "GM"])
    public async commit(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opRelease.commit(body.op_id);
    }

    @Post("/abort")
    @Authorized(["SERVICE", "GM"])
    public async abort(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opRelease.abort(body.op_id);
    }

}
