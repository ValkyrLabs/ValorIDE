#!/usr/bin/env node
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "2mb" }));

app.post("/webview-error", (req, res) => {
  console.log("\n--- Webview Error Payload Received (POST) ---");
  console.log(JSON.stringify(req.body, null, 2));
  console.log("---------------------------------------------\n");
  res.status(200).send({ ok: true });
});

// fallback GET endpoint to support Image src / querystring fallback when fetch/sendBeacon
app.get("/webview-error", (req, res) => {
  console.log("\n--- Webview Error Payload Received (GET) ---");
  console.log(req.query.payload || '<no payload>');
  console.log("--------------------------------------------\n");
  res.status(200).send({ ok: true });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Webview error server listening on http://localhost:${port}`);
});
