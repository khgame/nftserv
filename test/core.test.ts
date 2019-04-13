import {assert} from "chai";
import * as Path from "path";
import {Global} from "../src/global";

import {spawn, exec, ChildProcessWithoutNullStreams, ChildProcess} from 'child_process';

import {createReq} from './createReq';
import {initServices} from "../src/logic/service";
import {ObjectId} from "bson";
import {OpCode} from "../src/logic/model";
import {forMs} from "kht";


/**
 * prepare data
 */

const owner_id = `${Math.random()}`;
let requestBolb = {
    op_id: `${new ObjectId()}`,
    owner_id,
    data: {"test": 1},
    logic_mark: "hero"
};
let updateData = {
    op_id: `${new ObjectId()}`,
    nft_id: "",
    data: {
        name: "poko",
        level: 3,
        category: "cat"
    }
};


describe(`validate owner_id ${owner_id}`, async function () {
    process.env.NODE_ENV = "production";
    Global.setConf(Path.resolve(__dirname, `../src/conf.default.json`), false);
    // await ();
    let loginSvr: ChildProcess;
    before(async () => {
        await initServices();
        console.log("=> start login server mock");
        loginSvr = exec("npx kh-loginsvr start -m");
        await forMs(1000);
        console.log("=> start test");
    });

    after(async () => {
        await loginSvr.kill();
        console.log("=> end login server mock");
        process.exit(0);
    });

    it('/v1/nft/list : init empty', function (done) {
        createReq().get(`/v1/nft/list/${owner_id}`)
            .set('Accept', 'application/json')
            .send({})
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                assert.equal(res.body.result.length, 0);
                done();
            });
    });


    it('/v1/nft/issue : issue without authorization', function (done) {
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .send({
                ... requestBolb,
                op_id: `${Math.random()}`
            })
            .expect('Content-Type', /json/)
            .expect(403).end(done); // forbidden
    });

    it('/v1/nft/issue : issue with wrong authorization', function (done) {
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `#`)
            .send({
                ... requestBolb,
                op_id: `${Math.random()}`
            })
            .expect('Content-Type', /json/)
            .expect(403).end(done);
    });

    it('/v1/nft/issue : issue with wrong op_id', function (done) {
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', 'mock-server-identity')
            .send({
                op_id: `${Math.random()}`,
                owner_id,
                data: {test: 1},
                logic_mark: "hero"
            })
            .expect('Content-Type', /json/)
            .expect(500)
            .end(done);
    });

    it('/v1/nft/issue : satisfied nft ', function (done) {
        // console.log("data", data);
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
            .send(requestBolb)
            // .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                let result = res.body.result;
                // console.log("result", result);
                assert.equal(result.new, true);
                assert.equal(result.op._id, requestBolb.op_id);
                assert.equal(result.op.op_code, OpCode.ISSUE);
                assert.equal(result.op.params.owner_id, requestBolb.owner_id);
                assert.equal(result.op.params.logic_mark, requestBolb.logic_mark);
                assert.deepEqual(result.op.params.data, requestBolb.data);
                updateData.nft_id = result.op.nft_id;
                done();
            });
    });

    it('/v1/nft/issue : satisfied nft with same id ', function (done) {
        // console.log("data", data);
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
            .send(requestBolb)
            // .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                let result = res.body.result;
                // console.log("result", result);
                assert.equal(result.new, false);
                assert.equal(result.op.creator, 'mock-server-identity');
                assert.equal(result.op._id, requestBolb.op_id);
                assert.equal(result.op.op_code, OpCode.ISSUE);
                assert.equal(result.op.params.owner_id, requestBolb.owner_id);
                assert.equal(result.op.params.logic_mark, requestBolb.logic_mark);
                assert.deepEqual(result.op.params.data, requestBolb.data);
                updateData.nft_id = result.op.nft_id;
                done();
            });
    });

    it('/v1/nft/list : acquire list', function (done) {
        createReq().get(`/v1/nft/list/${owner_id}`)
            .set('Accept', 'application/json')
            .send({})
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                // console.log(res.body.result);
                assert.equal(res.body.result.length, 1);
                assert.equal(res.body.result[0]._id, updateData.nft_id);
                assert.equal(res.body.result[0].owner_id, requestBolb.owner_id);
                assert.equal(res.body.result[0].logic_mark, requestBolb.logic_mark);
                assert.deepEqual(res.body.result[0].data, requestBolb.data);
                done();
            });
    });

    it('/v1/nft/get : acquire nft', function (done) {
        createReq().get(`/v1/nft/get/${updateData.nft_id}`)
            .set('Accept', 'application/json')
            .send({})
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                // console.log(res.body.result);
                assert.equal(res.body.result._id, updateData.nft_id);
                assert.equal(res.body.result.owner_id, requestBolb.owner_id);
                assert.equal(res.body.result.logic_mark, requestBolb.logic_mark);
                assert.deepEqual(res.body.result.data, requestBolb.data);
                done();
            });
    });

    it('/v1/nft/update : update nft without authorization', function (done) {
        createReq().get(`/v1/nft/update`)
            .set('Accept', 'application/json')
            .send(updateData)
            .expect(405)
            .end(done);
    });

    it('/v1/nft/update : update nft with wrong authorization', function (done) {
        createReq().get(`/v1/nft/update`)
            .set('Accept', 'application/json')
            .send(updateData)
            .set('server_id', `#`)
            .expect(405) // method not allowed
            .end(done);
    });

    it('/v1/nft/update : update nft with correct authorization', function (done) {
        createReq().post(`/v1/nft/update`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
            .send(updateData)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                // console.log(res.body.result);
                assert.equal(res.body.result.new, true);
                assert.equal(res.body.result.op.creator, 'mock-server-identity');
                assert.equal(res.body.result.op._id, updateData.op_id);
                assert.equal(res.body.result.op.nft_id, updateData.nft_id);
                assert.deepEqual(res.body.result.op.params.data, updateData.data);
                done();
            });
    });

    it('/v1/nft/update : update nft with same id', function (done) {
        createReq().post(`/v1/nft/update`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
            .send(updateData)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                assert.equal(res.body.result.new, false);
                assert.equal(res.body.result.op.creator, 'mock-server-identity');
                assert.equal(res.body.result.op._id, updateData.op_id);
                assert.equal(res.body.result.op.nft_id, updateData.nft_id);
                assert.deepEqual(res.body.result.op.params.data, updateData.data);
                done();
            });
    });

    // todo: transfer

    // todo: burn

    // todo: check all operations

    // todo:

});
