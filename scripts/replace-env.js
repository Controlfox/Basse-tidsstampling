const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../src/environments/apps-script-url.ts");
const url =
  process.env.APPS_SCRIPT_URL ||
  "https://https://script.google.com/macros/s/AKfycbzNkgNjDa7ewJQo8YDb8atM1BW6P9eJXX3U5pTCiRP8COL4ZRRLYip5I5KUzKOZJwl4XQ/exec";

let content = fs.readFileSync(filePath, "utf8");
content = content.replace(/__APPS_SCRIPT_URL__/, url);
fs.writeFileSync(filePath, content);
