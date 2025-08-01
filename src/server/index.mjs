import express from "express";
import morgan from "morgan";
import cors from "cors";
import { getRowsByDateRange, getAvailableDateRange, getAircraftsByDateRange } from "../bot/db.mjs";
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

app.get("/tracks", cors(), async (req, res) => {
  const start = '2024';
  const end = '2030';
  const tracks = await getRowsByDateRange(start, end);
  const aircrafts = await getAircraftsByDateRange(start, end);
  res.json({ tracks, aircrafts });
});

app.get("/tracks/:date", cors(), async (req, res) => {
  const date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date format. Use yyyy-mm-dd." });
    return;
  }
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;
  const tracks = await getRowsByDateRange(start, end);
  const aircrafts = await getAircraftsByDateRange(start, end);
  res.json({ tracks, aircrafts });
});

app.get("/index", cors(), async (req, res) => {
  try {
    const range = await getAvailableDateRange();
    res.json({ tracks: range });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

export function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
