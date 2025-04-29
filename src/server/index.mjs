import express from "express";
import morgan from "morgan";
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
  res.header("Location", `https://globe.adsb.fi/?icao=${code}`);
  res.json({});
});

export function startServer(port = 3000) {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
