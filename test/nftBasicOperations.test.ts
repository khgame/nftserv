import {assert} from "chai";
import * as Path from "path";
import {Global} from "../src/global";

import {spawn, exec, ChildProcess} from 'child_process';

import {createReq} from './createReq';
import {initServices} from "../src/logic/service";
import {ObjectId} from "bson";
import {OpCode} from "../src/logic/model";
import {forMs} from "kht";


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
    to: 'the-test-receiver',
    memo: 'memo'
};
const burnBlob = {
    op_id: `${new ObjectId()}`,
    nft_id: "",
};

describe(`validate owner_id ${owner_id}`, async function () {
    process.env.NODE_ENV = "production";
    Global.setConf(Path.resolve(__dirname, `../src/conf.default.json`), false);
    let loginSvr: ChildProcess;

    before(async () => {
        await initServices();
        console.log("=> start login server mock");
        loginSvr = exec("npx kh-loginsvr start -m");
        await forMs(1000);
        console.log("=> start test");
    });

    after((done) => {
        loginSvr.kill();
        console.log("=> end login server mock");
        done();
    });

    describe("1. list & get : not exist", function () {

        it('/v1/nft/list : init empty', function (done) {
            createReq().get(`/v1/nft/list/${owner_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    assert.equal(res.body.result.length, 0);
                    done();
                });
        });

        it('/v1/nft/get : get by type-wrong id', function (done) {
            createReq().get(`/v1/nft/get/${Math.random()}`)
                .set('Accept', 'application/json')
                .send()
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    assert.equal(result, undefined);
                    done();
                });
        });

        it('/v1/nft/get : get by nonexistent id', function (done) {
            createReq().get(`/v1/nft/get/${new ObjectId()}`)
                .set('Accept', 'application/json')
                .send()
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    assert.equal(result, undefined);
                    done();
                });
        });
    });

    describe("2. issue", function () {

        it('/v1/nft/issue : only enable post method', function (done) {
            createReq().get(`/v1/nft/issue`)
                .set('Accept', 'application/json')
                .send({
                    ...issueBlob,
                    op_id: `${Math.random()}`
                })
                .expect(405).end(done); // forbidden
        });

        it('/v1/nft/issue : issue without authorization', function (done) {
            createReq().post(`/v1/nft/issue`)
                .set('Accept', 'application/json')
                .send({
                    ...issueBlob,
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
                    ...issueBlob,
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
            createReq().post(`/v1/nft/issue`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(issueBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    // console.log("result", result);
                    assert.equal(result.new, true);
                    assert.equal(result.op._id, issueBlob.op_id);
                    assert.equal(result.op.op_code, OpCode.ISSUE);
                    assert.equal(result.op.params.owner_id, issueBlob.owner_id);
                    assert.equal(result.op.params.logic_mark, issueBlob.logic_mark);
                    assert.deepEqual(result.op.params.data, issueBlob.data);
                    updateBlob.nft_id = result.op.nft_id;
                    transferBlob.nft_id = result.op.nft_id;
                    burnBlob.nft_id = result.op.nft_id;
                    done();
                });
        });

        it('/v1/nft/issue : satisfied nft with same id ', function (done) {
            // console.log("data", data);
            createReq().post(`/v1/nft/issue`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(issueBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    // console.log("result", result);
                    assert.equal(result.new, false);
                    assert.equal(result.op.creator, 'mock-server-identity');
                    assert.equal(result.op._id, issueBlob.op_id);
                    assert.equal(result.op.op_code, OpCode.ISSUE);
                    assert.equal(result.op.params.owner_id, issueBlob.owner_id);
                    assert.equal(result.op.params.logic_mark, issueBlob.logic_mark);
                    assert.deepEqual(result.op.params.data, issueBlob.data);
                    updateBlob.nft_id = result.op.nft_id;
                    done();
                });
        });

    });

    describe("3. list & get : exist", function () {

        it('/v1/nft/list : acquire list', function (done) {
            createReq().get(`/v1/nft/list/${owner_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body.result);
                    assert.equal(res.body.result.length, 1);
                    assert.equal(res.body.result[0]._id, updateBlob.nft_id);
                    assert.equal(res.body.result[0].owner_id, issueBlob.owner_id);
                    assert.equal(res.body.result[0].logic_mark, issueBlob.logic_mark);
                    assert.deepEqual(res.body.result[0].data, issueBlob.data);
                    done();
                });
        });

        it('/v1/nft/get : acquire nft', function (done) {
            createReq().get(`/v1/nft/get/${updateBlob.nft_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body.result);
                    assert.equal(res.body.result._id, updateBlob.nft_id);
                    assert.equal(res.body.result.owner_id, issueBlob.owner_id);
                    assert.equal(res.body.result.logic_mark, issueBlob.logic_mark);
                    assert.deepEqual(res.body.result.data, issueBlob.data);
                    done();
                });
        });
    });

    describe("4. update", function () {

        it('/v1/nft/update : only post method', function (done) {
            createReq().get(`/v1/nft/update`)
                .set('Accept', 'application/json')
                .send(updateBlob)
                .expect(405)
                .end(done);
        });

        it('/v1/nft/update : update nft without authorization', function (done) {
            createReq().post(`/v1/nft/update`)
                .set('Accept', 'application/json')
                .send(updateBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/nft/update : update nft with wrong authorization', function (done) {
            createReq().post(`/v1/nft/update`)
                .set('Accept', 'application/json')
                .set('server_id', `#`)
                .send(updateBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/nft/update : update nft with correct authorization', function (done) {
            createReq().post(`/v1/nft/update`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(updateBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body.result);
                    assert.equal(res.body.result.new, true);
                    assert.equal(res.body.result.op.creator, 'mock-server-identity');
                    assert.equal(res.body.result.op._id, updateBlob.op_id);
                    assert.equal(res.body.result.op.nft_id, updateBlob.nft_id);
                    assert.deepEqual(res.body.result.op.params.data, updateBlob.data);
                    done();
                });
        });

        it('/v1/nft/update : update nft with same id', function (done) {
            createReq().post(`/v1/nft/update`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(updateBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    assert.equal(res.body.result.new, false);
                    assert.equal(res.body.result.op.creator, 'mock-server-identity');
                    assert.equal(res.body.result.op._id, updateBlob.op_id);
                    assert.equal(res.body.result.op.nft_id, updateBlob.nft_id);
                    assert.deepEqual(res.body.result.op.params.data, updateBlob.data);
                    done();
                });
        });
    });

    describe("5. transfer", function () {

        it('/v1/nft/transfer : only post method', function (done) {
            createReq().get(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .send(transferBlob)
                .expect(405)
                .end(done);
        });

        it('/v1/nft/transfer : transfer nft without authorization', function (done) {
            createReq().post(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .send(transferBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/nft/transfer : transfer nft with wrong authorization', function (done) {
            createReq().post(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .set('server_id', `#`)
                .send(transferBlob)
                .expect(403) // method not allowed
                .end(done);
        });

        it('/v1/nft/transfer : transfer nft with error from id', function (done) {
            createReq().post(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send({
                    ...transferBlob,
                    from: "wrong_user"
                })
                .expect('Content-Type', /json/)
                .expect(500)
                .end(done);
        });

        it('/v1/nft/transfer : transfer nft with correct authorization and info', function (done) {
            createReq().post(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(transferBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body);
                    assert.equal(res.body.result.new, true);
                    assert.equal(res.body.result.op.creator, 'mock-server-identity');
                    assert.equal(res.body.result.op._id, transferBlob.op_id);
                    assert.equal(res.body.result.op.nft_id, transferBlob.nft_id);
                    assert.deepEqual(res.body.result.op.params, {
                        from: transferBlob.from,
                        to: transferBlob.to,
                        memo: transferBlob.memo
                    });
                    done();
                });
        });

        it('/v1/nft/transfer : transfer with same id', function (done) {
            createReq().post(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(transferBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body.result);
                    assert.equal(res.body.result.new, false);
                    assert.equal(res.body.result.op.creator, 'mock-server-identity');
                    assert.equal(res.body.result.op._id, transferBlob.op_id);
                    assert.equal(res.body.result.op.nft_id, transferBlob.nft_id);
                    assert.deepEqual(res.body.result.op.params, {
                        from: transferBlob.from,
                        to: transferBlob.to,
                        memo: transferBlob.memo
                    });
                    done();
                });
        });

    });


    describe("6. burn", function () {

        let nftd: any;

        it('/v1/nft/get : acquire nft', function (done) {
            createReq().get(`/v1/nft/get/${burnBlob.nft_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    assert.equal(res.body.result._id, updateBlob.nft_id);
                    nftd = res.body.result;
                    done();
                });
        });

        it('/v1/nft/burn : only post method', function (done) {
            createReq().get(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .send(burnBlob)
                .expect(405) // method not allowed
                .end(done);
        });

        it('/v1/nft/burn : burn nft without authorization', function (done) {
            createReq().post(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .send(burnBlob)
                .expect(403) // forbidden
                .end(done);
        });

        it('/v1/nft/burn : burn nft with wrong authorization', function (done) {
            createReq().post(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .set('server_id', `#`)
                .send(burnBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/nft/burn : burn nft with error from id', function (done) {
            createReq().post(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send({
                    ...burnBlob,
                    nft_id: "wrong_id"
                })
                .expect('Content-Type', /json/)
                .expect(500)
                .end(done);
        });

        it('/v1/nft/burn : burn nft with correct authorization and info', function (done) {
            createReq().post(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(burnBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(burnBlob, "\nres =>", res.body);
                    assert.equal(res.body.result.new, true);
                    assert.equal(res.body.result.op.op_code, OpCode.BURN);
                    assert.equal(res.body.result.op.creator, 'mock-server-identity');
                    assert.equal(res.body.result.op._id, burnBlob.op_id);
                    assert.equal(res.body.result.op.nft_id, burnBlob.nft_id);
                    done();
                });
        });

        it('/v1/nft/burn : burn with same id', function (done) {
            createReq().post(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(burnBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body.result.op.params);
                    assert.equal(res.body.result.new, false);
                    assert.equal(res.body.result.op.op_code, OpCode.BURN);
                    assert.equal(res.body.result.op.creator, 'mock-server-identity');
                    assert.equal(res.body.result.op._id, burnBlob.op_id);
                    assert.equal(res.body.result.op.nft_id, burnBlob.nft_id);
                    return done();
                });
        });

        it('/v1/nft/get : nft should not exist', function (done) {
            createReq().get(`/v1/nft/get/${burnBlob.nft_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    assert.equal(res.body.result, undefined);
                    done();
                });
        });

    });

    describe("7. operations", function () { // todo: check all operations


    });


    // todo: when locked

});
