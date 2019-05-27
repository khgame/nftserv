import {ApiApplication} from "../api";
import {CommandLineApp} from "@khgame/turtle/lib";

const clp = new CommandLineApp(
    "slg",
    "1.1.0",
    ["mongo", "redis"],
    [() => {
        return new ApiApplication();
    }],
    {
        "name": "khg_nft",
        "id": 0,
        "port": 11821,
        "drivers": {
            "mongo": {
                "host": "127.0.0.1",
                "port": 27017,
                "database": "khgame_nft_svr",
                "username": "",
                "password": ""
            },
            "redis": {
                "db": 0,
                "family": 4,
                "host": "127.0.0.1",
                "port": 6379,
                "keyPrefix": "KH_NFTServ_default_redisKey:",
                "key_mutex_wait_threshold": 100
            }
        },
        "rules": {
            "shelf": {
                "channels": [ "hero" ]
            },
            "rpc": {
                "login": {
                    "host" : "http://127.0.0.1:11801",
                    "root" : "/v1",
                    "api" : {
                        "online_state": "/session/online_state",
                        "game_svr_list": "/game_svr/list",
                        "info": "/core/info"
                    }
                }
            }
        }
    },
);
clp.run();
//
// async function main() {
//
//     let api: ApiApplication;
//
//     commander.version("0.1.0")
//         .command("start")
//         .description("start running nft service")
//         .option("-d, --development",
//             "(default env setting) similar to set NODE_ENV=development, and will read nftserv.development.json at executing position as config by default",
//             () => process.env.NODE_ENV = "development")
//         .option("-p, --production",
//             "similar to set NODE_ENV=production, and will read nftserv.production.json at executing position as config by default",
//             () => process.env.NODE_ENV = "production")
//         .option("-c, --config <path>",
//             "set config path, and the specified conf will override the default one set by NODE_ENV",
//             path => Global.setConf(path, true))
//         .option("-P, --port <port>",
//             "the port to serve api, will override the setting in config file, 11801 by default")
//         .action(async (options) => {
//             try {
//                 Global.setConf(Path.resolve(process.cwd(), `./nftserv.${process.env.NODE_ENV || "development"}.json`), false);
//             } catch (e) {
//                 Global.setConf(Path.resolve(__dirname, `../conf.default.json`), false);
//             }
//
//             console.log("config path :", Global.confPath);
//             Global.conf.port = (options && options.port) || Global.conf.port || 11801;
//             api = new ApiApplication();
//             // await initServices();
//             api.start(Global.conf.port);
//         });
//
//     commander.command("extract")
//         .description("extract default config to a file")
//         .option("-p, --path <path>", "the export path")
//         .action((options) => {
//             let extractPath = (options && options.path) || "./nftserv.development.json";
//             extractPath = Path.isAbsolute(extractPath) ? extractPath : Path.resolve(process.cwd(), extractPath);
//             fs.copyFileSync(Path.resolve(__dirname, `../conf.default.json`), extractPath);
//             process.exit(0); // 1);
//         });
//
//     commander.parse(process.argv);
//
//     process.on("SIGINT", async () => {
//         console.log("\n★★ SIGINT received, please hold ★★ ");
//         await api.shutdown();
//         console.log("★★ process exited ★★ ");
//         process.exit(0);
//     });
// }
//
// main().then(() => {
//     console.info("running @khgame/nftserv succeeded.");
// }).catch((reason => {
//     console.error(reason + "\nrunning @khgame/nftserv failed.");
//     process.exit(1);
// }));

