import { remixFastifyPlugin } from "@mcansh/remix-fastify";
import { broadcastDevReady } from "@remix-run/server-runtime";
import chokidar from "chokidar";
import fastify from "fastify";
import path from "path";
import { pathToFileURL } from "url";

const port = process.env.PORT ? +process.env.PORT : 3000;

const MODE = process.env.NODE_ENV;
const BUILD_FILE_PATH = path.join(process.cwd(), "build", "index.js");
const BUILD_FILE_URL = pathToFileURL(BUILD_FILE_PATH).href;

let update = Date.now();

const getLatestBuild = () => import(`${BUILD_FILE_URL}?update=${update}`);

async function notifyRemixServerIsReady() {
  update = Date.now();
  const build = await getLatestBuild();
  broadcastDevReady(build);
}

const app = fastify();

await app.register(remixFastifyPlugin, {
  build: await getLatestBuild(),
  mode: MODE,
});

app.listen({ port, host: "0.0.0.0" }, (_err, address) => {
  console.info(`Fastify server listening at ${address}`);

  if (MODE === "development") {
    notifyRemixServerIsReady();
  }
});

if (MODE === "development") {
  const watcher = chokidar.watch(
    `${path.dirname(BUILD_FILE_PATH).replace(/\\/g, "/")}/**.*`,
  );

  watcher.on("all", () => {
    notifyRemixServerIsReady();
  });
}

