import {API} from "../decorators";
import {Authorized, Body, CurrentUser, Post} from "routing-controllers";

@API("/nft")
export class NftController {

    constructor() {
    }

    @Post("/lock")
    @Authorized()
    public async lock(@CurrentUser() serverID: string) {
        return {
            locked: true
        }; // mock todo
    }

    @Post("/unlock")
    @Authorized()
    public async unlock(@CurrentUser() serverID: string, @Body() body: {
        nft_id: string
    }) {
        return {
            ok: true
        }; // mock todo
    }

    @Post("/shelf")
    @Authorized()
    public async shelf(@CurrentUser() serverID: string, @Body() body: {
        nft_id: string
    }) {
        return {
            ok: true
        }; // mock todo
    }

    @Post("/unshelf")
    @Authorized()
    public async unshelf(@CurrentUser() serverID: string, @Body() body: {
        nft_id: string
    }) {
        return {
            ok: true
        }; // mock todo
    }

    @Post("/update")
    @Authorized()
    public async update(@CurrentUser() serverID: string, @Body() body: {
        nft_id: string,
        data: string
    }) {
        return {
            ok: true
        }; // mock todo
    }

    @Post("/consume")
    @Authorized()
    public async consume(@CurrentUser() serverID: string, @Body() body: {
        nft_id: string
    }) {
        return {
            ok: true
        }; // mock todo
    }

    @Post("/produce")
    @Authorized()
    public async produce(@CurrentUser() serverID: string, @Body() body: {
        nft_id: string,
        data: string
    }) {
        return {
            ok: true
        }; // mock todo
    }

    @Post("/transaction")
    @Authorized()
    public async transaction(@CurrentUser() serverID: string, @Body() body: {
        actions: Array<{ op: string, args: string[] }>
    }) {
        return {
            ok: true
        }; // mock todo
    }


}
