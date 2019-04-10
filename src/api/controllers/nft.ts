import {API} from "../decorators";
import {Authorized, Body, Ctx, CurrentUser, Get, Param, Post} from "routing-controllers";
import {NftService} from "../../logic/nft";
import {Context} from "koa";
import {ObjectID} from "typeorm";

@API("/nft")
export class NftController {

    constructor(public readonly nftService: NftService) {
    }

    @Get("/list/:user_id")
    public async list(@Param("user_id") userId: string) {
        console.log("userId", userId);
        return await this.nftService.list(userId);
    }

    @Get("/info/:nft_id")
    public async info(@Param("nft_id") nftId: string) {
        return await this.nftService.get(nftId);
    }

    @Post("/shelf")
    public async shelf(
        @Ctx() ctx: Context,
        @CurrentUser() id: { uid: string, sid: string },
        @Body() body: {
            nft_id: string
            shelf_channel: string
            shelf_price: number
        }) {
        ctx.assert.ok(id.uid, "invalid user");
        return await this.nftService.shelf(id.uid, body.nft_id, body.shelf_channel, body.shelf_price);
    }

    @Post("/unshelf")
    public async unshelf(
        @Ctx() ctx: Context,
        @CurrentUser() id: { uid: string, sid: string },
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(id.uid, "invalid user");
        return await this.nftService.unshelf(id.uid, body.nft_id);
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
        return await this.nftService.lock(id.sid, body.nft_id);
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
        return await this.nftService.unlock(id.sid, body.nft_id);
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
        return await this.nftService.transfer(id.sid, body.from, body.to, body.nft_id, body.memo);
    }

    @Post("/update")
    @Authorized("GAME_SERVER")
    public async update(@Body() body: {
        server_id: string,
        nft_id: string,
        data: string
    }) {
        return await this.nftService.update(body.server_id, body.nft_id, body.data);
    }

    @Post("/consume")
    @Authorized("GAME_SERVER")
    public async consume(@Ctx() ctx: Context,
                         @Body() body: {
                             nft_id: string
                         }) {
        return this.nftService.burn(body.nft_id); // mock todo
    }

    @Post("/produce")
    @Authorized("GAME_SERVER")
    public async produce(@Ctx() ctx: Context,
                         @Body() body: {
                             uid: string
                             data: string
                         }) {
        ctx.assert.ok(body.uid, "invalid user");
        return await this.nftService.produce(body.uid, body.data);
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
