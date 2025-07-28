import express from "express";
import morgan from "morgan";
import cors from "cors";
import { aircrafts } from "../bot/bot.mjs";
import { getRowsByDateRange } from "../bot/db.mjs";
const app = express();

app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.status(401);
  res.json({});
});
app.get("/robots.txt", (req, res) => {
  res.header("content-type", "text/plain");
  res.send(["User-agent: *", "Disallow: /"].join("\n"));
});

app.get("/go/:code", (req, res) => {
  if (req.get("User-Agent")?.includes("Mastodon")) {
    res.status(403);
    res.json({ error: "disallowed by robots.txt" });
    return;
  }
  const code = req.params.code;
  if (!code.match(/[a-z0-9]+/)) {
    res.send("Invalid code");
  }
  res.status(302);
  res.header("Location", `https://globe.adsb.fi/?icao=${code}&zoom=13`);
  res.json({});
});

app.get("/aircrafts", cors(), (req, res) => {
  res.json(aircrafts);
});

app.get("/points/:date", cors(), (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date format. Use yyyy-mm-dd." });
    return;
  }
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  getRowsByDateRange(start, end, (err, rows) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
      return;
    }
    // Return as compact array of [lon, lat]
    const points = rows.map(r => [r.longitude, r.latitude]);
    res.json(points);
  });
});

export function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
