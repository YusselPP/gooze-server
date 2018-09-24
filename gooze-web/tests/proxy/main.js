/* eslint-env node */

const express = require("express");
const proxy = require("http-proxy-middleware");
const serveStatic = require("serve-static");
const {join} = require("path");

const app = express();
const target = "http://localhost:3000";


app.use("/development/admin", serveStatic(join(__dirname, "..", "..", "dist")));
app.use("/", proxy({target, ws: true}));
app.listen(8080);