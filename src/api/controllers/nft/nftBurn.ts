import {API} from "../../decorators";
import {Authorized, Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {NftService} from "../../../logic/nft";
import {Context} from "koa";
import {genLogger} from "../../../logic/service/logger";
import {IBurnParams, OpBurn} from "../../../logic/operation";

@API("/nft/burn")
export class NftBurnController {

    log = genLogger("api:nft:burn");

    constructor(
        public readonly nft: NftService,
        public readonly opBurn: OpBurn) {
    }

    @Post("/prepare")
    @Authorized(["SERVICE", "GM"])
    public async prepare(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { nft_id: string, params: IBurnParams }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opBurn.prepare(sid, body.nft_id, body.params);
    }

    @Post("/commit")
    @Authorized(["SERVICE", "GM"])
    public async commit(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opBurn.commit(body.op_id);
    }

    @Post("/abort")
    @Authorized(["SERVICE", "GM"])
    public async abort(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opBurn.abort(body.op_id);
    }

}
