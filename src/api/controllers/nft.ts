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
        @CurrentUser() userId: string,
        @Body() body: {
            nft_id: string
            shelf_channel: string
            shelf_price: number
        }) {
        ctx.assert.ok(userId, "invalid user");
        return await this.nftService.shelf(userId, body.nft_id, body.shelf_channel, body.shelf_price);
    }

    @Post("/unshelf")
    public async unshelf(
        @Ctx() ctx: Context,
        @CurrentUser() userId: string,
        @Body() body: {
            nft_id: string
        }) {
        ctx.assert.ok(userId, "invalid user");
        return await this.nftService.unshelf(userId, body.nft_id);
    }

    @Post("/lock")
    @Authorized("GAME_SERVER")
    public async lock(@Body() body: {
        server_id: string
        nft_id: string
    }) {
        return await this.nftService.lock(body.server_id, body.nft_id);
    }

    @Post("/unlock")
    @Authorized("GAME_SERVER")
    public async unlock(@Body() body: {
        server_id: string
        nft_id: string
    }) {
        return await this.nftService.unlock(body.server_id, body.nft_id);
    }

    @Post("/transfer")
    @Authorized("GAME_SERVER")
    public async transfer(@Body() body: {
        server_id: string
        from: string
        to: string
        nft_id: string
        memo: string
    }) {
        return await this.nftService.transfer(body.server_id, body.from, body.to, body.nft_id, body.memo);
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
                         @CurrentUser() userId: string,
                         @Body() body: {
                             nft_id: string
                         }) {
        ctx.assert.ok(userId, "invalid user");
        return this.nftService.burn(body.nft_id); // mock todo
    }

    @Post("/produce")
    @Authorized("GAME_SERVER")
    public async produce(@Ctx() ctx: Context,
                         @CurrentUser() userId: string,
                         @Body() body: {
                             data: string
                         }) {
        ctx.assert.ok(userId, "invalid user");
        return await this.nftService.produce(userId, body.data);
    }

    @Post("/transaction")
    @Authorized("GAME_SERVER")
    public async transaction(@CurrentUser() userId: string, @Body() body: {
        actions: Array<{ op: string, args: string[] }>
    }) {
        return {
            ok: true
        }; // mock todo
    }


}
