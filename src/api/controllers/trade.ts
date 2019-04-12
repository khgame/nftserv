import {API} from "../decorators";
import {Body, Ctx, CurrentUser, Post} from "routing-controllers";
import {Context} from "koa";
import {TradeService} from "../../logic/trade";

@API("/trade")
export class TradeController {

    constructor(public readonly tradeService: TradeService) {
    }    //
    // @Post("/shelf")
    // public async shelf(
    //     @Ctx() ctx: Context,
    //     @CurrentUser() {uid}: { uid: string },
    //     @Body() body: {
    //         nft_id: string
    //         shelf_channel: string
    //         shelf_price: number
    //     }) {
    //     ctx.assert.ok(uid, "invalid user");
    //     return await this.tradeService.shelf(uid, body.nft_id, body.shelf_channel, body.shelf_price);
    // }
    //
    // @Post("/unshelf")
    // public async unshelf(
    //     @Ctx() ctx: Context,
    //     @CurrentUser() {uid}: { uid: string },
    //     @Body() body: {
    //         nft_id: string
    //     }) {
    //     ctx.assert.ok(uid, "invalid user");
    //     return await this.tradeService.unshelf(uid, body.nft_id);
    // }


}
