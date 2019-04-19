import {ApiApplication} from "../src/api";
import * as request from "supertest";
import {Test} from "supertest";
import chalk from "chalk";

export function createReq() {
    const server = (new ApiApplication()).server;
    return request(server);
}

export function itPost(desc: string,
                       url: string | (() => string),
                       header: any = {},
                       data: any | (() => any) = {},
                       expect: (req: Test) => any,
                       validate?: (body: any) => any) {
    it(desc + " : POST[" + url + "]",  function(done) {
        const urlFinal = typeof url === 'string' ? url : url();
        if (data instanceof Function) {
            data = data();
        }

        console.log(
            chalk.gray("\t■ POST url :"),
            chalk.blue(urlFinal),
            Object.keys(data).reduce((p, k) => `${p}  ${chalk.cyan(k)}<${chalk.yellow(data[k])}>`, ''));

        let req = createReq().post(urlFinal).set('Accept', 'application/json');
        for (const key in header) {
            if (!header.hasOwnProperty(key)) {
                continue;
            }
            req = req.set(key, header[key]);
        }

        req = req.send(data);
        expect(req);
        req.end(function (err, res) {
            if (err) {
                console.log("------error------", desc, "\n[data] :\n", data, "\n[res.body] :\n", res.body, "\n-----------------");
                return done(err);
            }
            const result = res.body;
            if (validate) {
                validate(result);
            }
            done();
        });
    });
}


export function itGet(desc: string,
                      url: string | (() => string),
                      header: any = {},
                      expect: (req: Test) => any,
                      validate?: (body: any) => any) {
    it(`${desc} : GET[${url}]`, done => {
        const urlFinal = typeof url === 'string' ? url : url();
        console.log(chalk.gray("\t◆ GET url :"), chalk.blue(urlFinal));

        let req = createReq().get(urlFinal).set('Accept', 'application/json');
        for (const key in header) {
            if (!header.hasOwnProperty(key)) {
                continue;
            }
            req = req.set(key, header[key]);
        }
        req = req.send({});
        expect(req);
        req.end(function (err, res) {
            if (err) {
                console.log(desc, "res.body:", res.body);
                return done(err);
            }
            const result = res.body;
            if (validate) {
                validate(result);
            }
            done();
        });
        return;
    });
}
