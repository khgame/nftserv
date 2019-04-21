import {API} from "../../decorators";
import {Authorized, Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {Context} from "koa";
import {genLogger} from "../../../logic/service/logger";
import {IUpdateParams, OpUpdate} from "../../../logic/operation";

@API("/nft/update")
export class NftUpdateController {

    log = genLogger("api:nft:update");

    constructor(public readonly opUpdate: OpUpdate) {
    }

    @Post("/prepare")
    @Authorized(["SERVICE", "GM"])
    public async prepare(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { nft_id: string, params: IUpdateParams }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opUpdate.prepare(sid, body.nft_id, body.params);
    }

    @Post("/commit")
    @Authorized(["SERVICE", "GM"])
    public async commit(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opUpdate.commit(body.op_id);
    }

    @Post("/abort")
    @Authorized(["SERVICE", "GM"])
    public async abort(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opUpdate.abort(body.op_id);
    }

}
