import {assert} from "chai";
import * as Path from "path";
import {Global} from "../src/global";

import {spawn, exec, ChildProcessWithoutNullStreams, ChildProcess} from 'child_process'

import {createReq} from './createReq';
import {initServices} from "../src/logic/service";
import {ObjectId} from "bson";
import {OpCode} from "../src/logic/model";
import {forMs} from "kht";


const owner_id = `${Math.random()}`;
describe(`validate owner_id ${owner_id}`, async function () {
    process.env.NODE_ENV = "production";
    Global.setConf(Path.resolve(__dirname, `../src/conf.default.json`), false);
    // await ();
    let loginSvr : ChildProcess;
    before(async () => {
        await initServices();
    });

    beforeEach(async () => {
        loginSvr = exec("npx kh-loginsvr start -m");
        console.log("=> start login server mock");
        await forMs(1000);
        console.log("=> start test");
    })

    afterEach(async () => {
        await loginSvr.kill();
        console.log("=> end login server mock");
    })

    it('init empty', function (done) {
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


    it('issue without authorization', function (done) {
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `#`)
            .send({
                op_id: `${Math.random()}`,
                owner_id,
                data: {test: 1},
                logic_mark: "hero"
            })
            .expect('Content-Type', /json/)
            .expect(403).end(done);
    });

    it('issue with wrong op_id', function (done) {
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
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

    it('issue', function (done) {
        let data = {
            op_id: `${new ObjectId()}`,
            owner_id,
            data: {"test": 1},
            logic_mark: "hero"
        };
        // console.log("data", data);
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
            .send(data)
            // .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    done(err);
                }
                let result = res.body.result;
                // console.log("result", result);
                assert.equal(result.new, true);
                assert.equal(result.op._id, data.op_id);
                assert.equal(result.op.op_code, OpCode.ISSUE);
                assert.equal(result.op.params.owner_id, data.owner_id);
                done();
            });
    });
});
