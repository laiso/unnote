#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import got from "got";
import fs from "fs";
import { fileURLToPath } from "url";

async function unnote(username, page = 1, counter = 0) {
  try {
    
    const response = await got(
      `https://note.com/api/v2/creators/${username}/contents?kind=note&page=${page}`,
      { responseType: "json" }
    );
    fs.writeFile(
      `data/contents-${page}.json`,
      JSON.stringify(response.body.data),
      (err) => {
        if (err) console.error(err);
      }
    );

    const keys = response.body.data.contents.map((c) => c.key);
    for (const key of keys) {
      const note = await getNote(key);
      fs.writeFile(`data/note/${key}.json`, JSON.stringify(note), (err) => {
        if (err) console.error(err);
      });
      console.info(`${note.publish_at} / ${note.tweet_text}`);
      counter += 1;
      await sleep(1000);
    }

    if (response.body.data.isLastPage) {
      console.info(`written out about ${counter} notes`);
    } else {
      await sleep(1000);
      unnote(username, page + 1);
    }
  } catch (error) {
    console.error(error);
    console.error(error?.response);
    console.error(error?.response?.body);
    process.exit(-1);
  }
}

async function getNote(key) {
  const response = await got(`https://note.com/api/v3/notes/${key}`, {
    responseType: "json",
  });
  return response.body.data;
}

// https://qiita.com/asa-taka/items/888bc5a1d7f30ee7eda2
const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  fs.mkdirSync("data/note", { recursive: true });

  yargs(hideBin(process.argv))
    .command(
      "export [username] [page]",
      "start the program",
      (yargs) => {
        return yargs
          .positional("username", {
            describe: "user name",
          })
          .positional("page", {
            describe: "page to start",
            default: 1,
          });
      },
      (argv) => {
        if (!argv.username) {
          console.error(`invalid opts: run it as 'export [username]'`);
          process.exit(-1);
        }
        unnote(argv.username, argv.page);
      }
    )
    .parse();
}
