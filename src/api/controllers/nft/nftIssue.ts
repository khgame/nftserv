import {API} from "../../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {NftService} from "../../../logic/nft";
import {Context} from "koa";
import {genLogger} from "../../../logic/service/logger";
import {IIssueParams, OpIssue} from "../../../logic/operation/index";


@API("/nft/issue")
export class NftIssueController {

    log = genLogger("api:nft:issue");

    constructor(
        public readonly nft: NftService,
        public readonly opIssue: OpIssue) {
    }

    @Post("/prepare")
    @Authorized(["SERVICE", "GM"])
    public async prepare(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { nft_id: string, params: IIssueParams }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opIssue.prepare(sid, body.nft_id, body.params);
    }

    @Post("/commit")
    @Authorized(["SERVICE", "GM"])
    public async commit(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opIssue.commit(body.op_id);
    }

    @Post("/abort")
    @Authorized(["SERVICE", "GM"])
    public async abort(
        @Ctx() ctx: Context,
        @CurrentUser() {sid}: { sid: string },
        @Body() body: { op_id: string }) {
        ctx.assert.ok(sid, "invalid server id");
        return await this.opIssue.abort(body.op_id);
    }

}
