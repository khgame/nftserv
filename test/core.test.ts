
import {assert} from "chai";
import * as Path from "path";
import {Global} from "../src/global";

import {createReq} from './createReq';
import {initServices} from "service";
import {ObjectId} from "bson";
import {OperationCode} from "../bench/entities";


const uid = `${Math.random()}`;
describe(`validate uid ${uid}`, async function () {
    process.env.NODE_ENV = "production";
    Global.setConf(Path.resolve(__dirname, `../src/conf.default.json`), false);
    // await ();
    before(initServices);

    it('init empty', function (done) {
        createReq().get(`/v1/nft/list/${uid}`)
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
                uid,
                data: {test: 1},
                logic_mark: "hero"
            })
            // .expect('Content-Type', /json/)
            .expect(403).end(done);
    });

    it('issue with wrong op_id', function (done) {
        createReq().post(`/v1/nft/issue`)
            .set('Accept', 'application/json')
            .set('server_id', `mock-server-identity`)
            .send({
                op_id: `${Math.random()}`,
                uid,
                data: {test: 1},
                logic_mark: "hero"
            })
            // .expect('Content-Type', /json/)
            .expect(500)
            .end(done);
    });

    it('issue', function (done) {
        let data = {
            op_id: `${new ObjectId()}`,
            uid,
            data: {"test": 1},
            logic_mark: "hero"
        };
        console.log("data", data);
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
                console.log("result", result);
                assert.equal(result.new, true);
                assert.equal(result.op.op_code, OperationCode.ISSUE);
                assert.equal(result.op.op_id, data.op_id);
                done();
            });
    });
});
