import {assert} from "chai";
import * as Path from "path";
import {Global} from "../src/global";

import {spawn, exec, ChildProcess} from 'child_process';

import {createReq} from './createReq';
import {initServices} from "../src/logic/service";
import {ObjectId} from "bson";
import {LockStatus, OpCode} from "../src/logic/model";
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

describe(`validate owner_id ${owner_id}`, async function () {
    process.env.NODE_ENV = "production";
    Global.setConf(Path.resolve(__dirname, `../src/conf.default.json`), false);
    let loginSvr: ChildProcess;

    before(async () => {
        await initServices();
        console.log("=> start login server mock");
        loginSvr = exec("npx kh-loginsvr start -m", function (err) {
            console.log('child exit code (exec)', err!.code);
        });
        await forMs(1000);
        console.log("=> start test");
    });

    after((done) => {
        loginSvr.kill();
        console.log("=> end login server mock");
        done();
    });

    describe("1. no lock has been set", function () {

        it('/v1/nft/issue : satisfied nft ', function (done) {
            // console.log("data", data);
            createReq().post(`/v1/nft/issue`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(issueBlob)
                // .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    assert.equal(result.new, true);
                    assert.equal(result.op._id, issueBlob.op_id);
                    voteBlob.nft_id = result.op.nft_id;
                    releaseBlob.nft_id = result._id;
                    done();
                });
        });

        it('/v1/lock/get : acquire lock of nft', function (done) {
            createReq().get(`/v1/lock/get/${voteBlob.nft_id}`)
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

    describe("2. vote lock", function () {

        it('/v1/lock/vote : only post method', function (done) {
            createReq().get(`/v1/lock/vote`)
                .set('Accept', 'application/json')
                .send(voteBlob)
                .expect(405)
                .end(done);
        });

        it('/v1/lock/vote : vote nft without authorization', function (done) {
            createReq().post(`/v1/lock/vote`)
                .set('Accept', 'application/json')
                .send(voteBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/lock/vote : vote nft with wrong authorization', function (done) {
            createReq().post(`/v1/lock/vote`)
                .set('Accept', 'application/json')
                .set('server_id', `#`)
                .send(voteBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/lock/vote', function (done) {
            createReq().post(`/v1/lock/vote`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(voteBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    // console.log(res.body);
                    assert.equal(result.nft_id, voteBlob.nft_id);
                    assert.equal(result.locker, 'mock-server-identity');
                    assert.equal(result.state, LockStatus.PREPARED);
                    continueBlob.lock_id = result._id;
                    abortBlob.lock_id = result._id;
                    done();
                });
        });

        it('/v1/lock/get : acquire lock of nft', function (done) {
            createReq().get(`/v1/lock/get/${voteBlob.nft_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body);
                    let result = res.body.result;
                    assert.equal(result.nft_id, voteBlob.nft_id);
                    assert.equal(result.locker, 'mock-server-identity');
                    assert.equal(result.state, LockStatus.PREPARED);
                    done();
                });
        });

        it('/v1/lock/check : acquire lock by lock_id', function (done) {
            createReq().get(`/v1/lock/check/${continueBlob.lock_id}`)
                .set('Accept', 'application/json')
                .send({})
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    // console.log(res.body);
                    let result = res.body.result;
                    assert.equal(result.nft_id, voteBlob.nft_id);
                    assert.equal(result.locker, 'mock-server-identity');
                    assert.equal(result.state, LockStatus.PREPARED);
                    done();
                });
        });

    });


    describe("3. execute each operation when locker state is prepared", function () {
        const updateBlob = {
            op_id: `${new ObjectId()}`,
            nft_id: voteBlob.nft_id,
            data: {
                name: "poko",
                level: 3,
                category: "cat"
            }
        };
        const transferBlob = {
            op_id: `${new ObjectId()}`,
            nft_id: voteBlob.nft_id,
            from: owner_id,
            to: 'the-test-receiver',
            memo: 'memo'
        };
        const burnBlob = {
            op_id: `${new ObjectId()}`,
            nft_id: voteBlob.nft_id,
        };

        it('/v1/nft/update : update nft when lock PREPARED', function (done) {
            createReq().post(`/v1/nft/update`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(updateBlob)
                .expect('Content-Type', /json/)
                .expect(500)
                .end(done);
        });

        it('/v1/nft/transfer : transfer nft when lock PREPARED', function (done) {
            createReq().post(`/v1/nft/transfer`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(transferBlob)
                .expect('Content-Type', /json/)
                .expect(500)
                .end(done);
        });

        it('/v1/nft/burn : burn nft when lock PREPARED', function (done) {
            createReq().post(`/v1/nft/burn`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(burnBlob)
                .expect('Content-Type', /json/)
                .expect(500)
                .end(done);
        });

    });

    describe("4. abort lock", function () {

        it('/v1/lock/abort : only post method', function (done) {
            createReq().get(`/v1/lock/abort`)
                .set('Accept', 'application/json')
                .send(abortBlob)
                .expect(405)
                .end(done);
        });

        it('/v1/lock/abort : abort nft without authorization', function (done) {
            createReq().post(`/v1/lock/abort`)
                .set('Accept', 'application/json')
                .send(abortBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/lock/abort : abort nft with wrong authorization', function (done) {
            createReq().post(`/v1/lock/abort`)
                .set('Accept', 'application/json')
                .set('server_id', `#`)
                .send(voteBlob)
                .expect(403)
                .end(done);
        });

        it('/v1/lock/abort', function (done) {
            createReq().post(`/v1/lock/abort`)
                .set('Accept', 'application/json')
                .set('server_id', `mock-server-identity`)
                .send(abortBlob)
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        console.log(res.body);
                        return done(err);
                    }
                    let result = res.body.result;
                    // console.log(res.body);
                    assert.equal(result.nft_id, voteBlob.nft_id);
                    assert.equal(result.locker, 'mock-server-identity');
                    assert.equal(result.state, LockStatus.ABORTED);
                    done();
                });
        });

        it('/v1/lock/get : acquire lock of the nft - should be undefined', function (done) {
            createReq().get(`/v1/lock/get/${voteBlob.nft_id}`)
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

        it('/v1/lock/check : acquire lock of the id - should be undefined', function (done) {
            createReq().get(`/v1/lock/check/${continueBlob.lock_id}`)
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

    // todo: 5. execute each operation when lock aborted

    // todo: 6. continue

    // todo: 7. execute each operation when locker state is committed

    // todo: 8. release lock

    // todo: 9. execute each operation in unlock state

    // todo: 10. check lock and lock_terminated in database

});
