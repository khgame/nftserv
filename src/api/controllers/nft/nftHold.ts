import {API} from "../../decorators";
import {Authorized, Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {Context} from "koa";
import {genLogger} from "@khgame/turtle/lib";
import {IHoldParams, OpHold} from "../../../logic/operation";

@API("/nft/hold")
export class NftHoldController {

    log = genLogger("api:nft:hold");

    constructor(public readonly opHold: OpHold) {
    }

    @Post("/prepare")
    @Authorized(["SERVICE", "GM"])
    public async prepare(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { nft_id: string, params: IHoldParams }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opHold.prepare(sid, body.nft_id, body.params);
    }

    @Post("/commit")
    @Authorized(["SERVICE", "GM"])
    public async commit(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opHold.commit(body.op_id);
    }

    @Post("/abort")
    @Authorized(["SERVICE", "GM"])
    public async abort(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opHold.abort(body.op_id);
    }

}
