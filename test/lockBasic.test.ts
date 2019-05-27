import {assert} from "chai";
import * as Path from "path";
import {spawn, exec, ChildProcess} from "child_process";

import {createReq, itGet, itPost} from "./createReq";
import {ObjectId} from "bson";
import {LockStatus} from "../src/logic/model";
import {forMs} from "kht";
import {OpCode, OpStatus} from "../src/logic/operation";
import {turtle} from "@khgame/turtle/lib";
import {waitForLoginSvrAlive} from "../src/service/login";


/**
 * prepare data
 */

const owner_id = `${Math.random()}`;
const issueBlob = {
    op_id: `${new ObjectId()}`,
    owner_id,
    data: {"test": 1},
    logic_mark: "hero"
};
const voteBlob = {
    nft_id: "",
};
const continueBlob = {
    lock_id: "",
};
const abortBlob = {
    lock_id: "",
};
const releaseBlob = {
    nft_id: "",
};

const updateBlob = {
    op_id: `${new ObjectId()}`,
    nft_id: "",
    data: {
        name: "poko",
        level: 3,
        category: "cat"
    }
};
const transferBlob = {
    op_id: `${new ObjectId()}`,
    nft_id: "",
    from: owner_id,
    to: "the-test-receiver",
    memo: "memo"
};
const burnBlob = {
    op_id: `${new ObjectId()}`,
    nft_id: "",
};

describe(`validate owner_id ${owner_id}`, async function () {
    process.env.NODE_ENV = "production";
    let loginSvr: ChildProcess;

    before(async function() {
        const confPath = Path.resolve(__dirname, `./conf.default.json`);
        console.log("=> set config", confPath, turtle.conf);
        turtle.setConf(confPath, false);
        console.log(turtle.conf);

        console.log("=> enter test");
        this.timeout(10000);
        await turtle.initialDrivers(["mongo", "redis"]);
        console.log("=> start login server mock");
        loginSvr = exec("npx kh-loginsvr start -m", function (err) {
            console.log("child exit code (exec)", err!.code);
        });
        await waitForLoginSvrAlive();
    });

    after((done) => {
        loginSvr.kill();
        console.log("=> end login server mock");
        done();
    });

    describe("1. no lock has been set", function () {

        itPost("satisfied nft", "/v1/nft/issue",
            {"server_id": `mock-server-identity`},
            issueBlob,
            req => req.expect(200),
            (body) => {
                let result = body.result;
                assert.equal(result.new, true);
                assert.equal(result.op._id, issueBlob.op_id);
                voteBlob.nft_id = result.op.nft_id;
                releaseBlob.nft_id = result.op.nft_id;
                updateBlob.nft_id = result.op.nft_id;
                transferBlob.nft_id = result.op.nft_id;
                burnBlob.nft_id = result.op.nft_id;
                console.log("nft id set :", voteBlob.nft_id);
            }
        );

        itGet("acquire lock of nft", () => `/v1/lock/get/${voteBlob.nft_id}`, {},
            req => req.expect(200),
            body => assert.equal(body.result, undefined)
        );
    });

    describe("2. vote lock", function () {

        itGet("only post method", "/v1/lock/vote", {server_id: `mock-server-identity`},
            req => req.expect(405));

        itPost("vote nft without authorization", "/v1/lock/vote", {}, voteBlob,
            req => req.expect(403));

        itPost("vote nft with wrong authorization", "/v1/lock/vote", {"server_id": `#`}, voteBlob,
            req => req.expect(403));

        itPost("correct vote", "/v1/lock/vote", {server_id: `mock-server-identity`}, voteBlob,
            req => req.expect("Content-Type", /json/).expect(200),
            body => {
                let result = body.result;
                // console.log("voteBlob", voteBlob); // res.body);
                assert.equal(result.nft_id, voteBlob.nft_id);
                assert.equal(result.locker, "mock-server-identity");
                assert.equal(result.state, LockStatus.PREPARED);
                continueBlob.lock_id = result._id;
                abortBlob.lock_id = result._id;
            });


        itGet("acquire lock of nft", () => `/v1/lock/get/${voteBlob.nft_id}`, {},
            req => req.expect("Content-Type", /json/).expect(200),
            body => {
                let result = body.result;
                assert.equal(result.nft_id, voteBlob.nft_id);
                assert.equal(result.locker, "mock-server-identity");
                assert.equal(result.state, LockStatus.PREPARED);
            });

        itGet("acquire lock by lock_id", () => `/v1/lock/check/${continueBlob.lock_id}`, {},
            req => req.expect("Content-Type", /json/).expect(200),
            body => {
                let result = body.result;
                assert.equal(result.nft_id, voteBlob.nft_id);
                assert.equal(result.locker, "mock-server-identity");
                assert.equal(result.state, LockStatus.PREPARED);
            }
        );

    });

    describe("3. execute each operation when the nft are locked by others ", function () {

        itGet("acquire lock of nft",
            () => `/v1/lock/get/${voteBlob.nft_id}`,
            {},
            req => req.expect("Content-Type", /json/).expect(200),
            function (body) {
                let result = body.result;
                assert.equal(result.nft_id, voteBlob.nft_id);
                assert.equal(result.locker, "mock-server-identity");
                assert.equal(result.state, LockStatus.PREPARED);
            }
        );

        itPost("update nft when the nft are locked by others", `/v1/nft/update`,
            {server_id: `mock-server-identity-1`}, updateBlob, // {...updateBlob, op_id: `${new ObjectId()}`},
            req => req.expect("Content-Type", /json/).expect(500));

        itPost("transfer nft when the nft are locked by others", "/v1/nft/transfer",
            {server_id: `mock-server-identity-1`}, transferBlob,
            req => req.expect("Content-Type", /json/).expect(500));

        itPost("burn nft when the nft are locked by others", "/v1/nft/burn",
            {server_id: `mock-server-identity-1`}, burnBlob,
            req => req.expect("Content-Type", /json/).expect(500));
    });


    describe("4. execute each operation when locker state is prepared", function () {

        itPost("update nft when locker state is prepared", `/v1/nft/update`,
            {server_id: `mock-server-identity`}, updateBlob, // {...updateBlob, op_id: `${new ObjectId()}`},
            req => req.expect("Content-Type", /json/).expect("Content-Type", /json/).expect(200),
            body => {
                const result = body.result;
                assert.equal(result.new, true);
                assert.equal(result.op.op_code, OpCode.UPDATE);
                assert.equal(result.op.state, OpStatus.COMMITTED);
                assert.equal(result.op.nft_id, updateBlob.nft_id);
            });

        itPost("transfer nft when locker state is prepared", "/v1/nft/transfer",
            {server_id: `mock-server-identity`}, transferBlob,
            req => req.expect("Content-Type", /json/).expect("Content-Type", /json/).expect(200),
            body => {
                const result = body.result;
                assert.equal(result.new, true);
                assert.equal(result.op.op_code, OpCode.TRANSFER);
                assert.equal(result.op.state, OpStatus.COMMITTED);
                assert.equal(result.op.params.to, transferBlob.to);
                assert.equal(result.op.nft_id, transferBlob.nft_id);
            });

        itPost("burn nft when locker state is prepared", "/v1/nft/burn",
            {server_id: `mock-server-identity`}, burnBlob,
            req => req.expect("Content-Type", /json/).expect("Content-Type", /json/).expect(200),
            body => {
                const result = body.result;
                assert.equal(result.new, true);
                assert.equal(result.op.op_code, OpCode.BURN);
                assert.equal(result.op.state, OpStatus.COMMITTED);
                assert.equal(result.op.nft_id, burnBlob.nft_id);
            });

    });

    describe("5. abort lock", function () {

        itGet("only post method", "/v1/lock/abort",
            {server_id: `mock-server-identity`},
            req => req.expect(405));

        itPost("abort op without authorization", "/v1/lock/abort",
            {}, abortBlob,
            req => req.expect(403));


        itPost("abort op with wrong authorization", "/v1/lock/abort",
            {server_id: `#`}, abortBlob,
            req => req.expect(403));


        itPost("correct abort", "/v1/lock/abort",
            {server_id: `mock-server-identity`}, abortBlob,
            req => req.expect("Content-Type", /json/).expect(200),
            body => {
                const result = body.result;
                assert.equal(result.nft_id, voteBlob.nft_id);
                assert.equal(result.locker, "mock-server-identity");
                assert.equal(result.state, LockStatus.ABORTED);
            });

        itGet("should be disable to get lock of nft", () => `/v1/lock/get/${voteBlob.nft_id}`, {},
            req => req.expect("Content-Type", /json/).expect(200),
            body => assert.equal(body.result, undefined));

        itGet("should be disable to get lock by lock_id", () => `/v1/lock/check/${abortBlob.lock_id}`, {},
            req => req.expect("Content-Type", /json/).expect(200),
            body => assert.equal(body.result, undefined));

    });

    // todo: 5. execute each operation when lock aborted

    // todo: 6. continue

    // todo: 7. execute each operation when locker state is committed

    // todo: 8. release lock

    // todo: 9. execute each operation in unlock state

    // todo: 10. check lock and lock_terminated in database

});
