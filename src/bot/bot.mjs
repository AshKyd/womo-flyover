import flightradarapi from "flightradarapi";
import fs from "fs";
import dotenv from "dotenv";
import {
  articleise,
  getAirline,
  isInBoundingBox,
  makeGeoJson,
  sanitiseModel,
} from "./utils.mjs";
import { post } from "./post.mjs";
import { getRowsByDateRange, insertRow, updateAircraft } from "./db.mjs";

dotenv.config();

const airportCodes = JSON.parse(fs.readFileSync("data/airportCodes.json"));
let announcedFlights = [];
const bbox = [-27.46534, 153.02393, -27.51268, 152.994664];

function getMessage(flight, frData) {
  const src = frData?.originAirportIata;
  const dest = frData?.destinationAirportIata;
  const srcName = airportCodes[src];
  const destName = airportCodes[dest];
  const flightNumber = flight.flight?.trim();
  const airline = getAirline(flight);
  const model = sanitiseModel(flight.desc);

  const url = `${process.env.BASEURL || "http://localhost:3000"}/go/${flight.hex
    }`;

  if (flight.category === "A7") {
    return `🚁 ${airline} is flying ${articleise(
      model
    )} helicopter overhead ${url}`;
  }

  if (src && dest) {
    return `✈️ ${airline} flight ${flightNumber} from ${srcName || src} to ${destName || dest
      }, operating ${articleise(model)} is passing overhead ${url}`;
  }
  return `${airline}, flight ${flightNumber} operating ${articleise(
    model
  )} is passing overhead ${url}`;
}

async function announceFlight(flight) {
  const rego = flight.r?.trim().toUpperCase();
  if (announcedFlights.includes(rego)) {
    return;
  }

  const frData = await correlateFlightRadar(flight).catch((e) => null);
  const message = getMessage(flight, frData);
  console.log(
    new Date().toISOString(),
    "found flight",
    JSON.stringify({ flight, frData })
  );
  post(message);
  announcedFlights = [rego, ...announcedFlights.slice(0, 10)];
}

let accumulatedFlights = {};

export let aircrafts = {};

/** add tracks to flights, so we can see where they've been and where they're going */
function accumulateFlights(aircraft) {
  const _accumulatedFlights = accumulatedFlights;
  const newAccumulations = {};
  aircraft.forEach((plane) => {
    const rego = plane.r?.trim();
    if (!rego) {
      return;
    }
    let log = _accumulatedFlights[rego] || [];
    log.push([plane.lon, plane.lat]);
    if (log.length > 1000) {
      log = log.slice(log.length - 1000);
    }
    newAccumulations[rego] = log;
    plane.lineString = log;
    aircrafts[rego] = plane;
    insertRow(getAESTISOString(), plane.lat, plane.lon, rego, plane.alt_baro === "ground" ? 0 : (plane.alt_baro || null));
    updateAircraft(
      {
        name: rego,
        model: sanitiseModel(plane.desc),
        airline: getAirline(plane),
        category: plane.category || "",
        year: plane.year || "",
        ownOp: plane.ownOp || ""
      },
      (err) => {
        if (err) {
          console.error("Aircraft upsert error:", err);
        }
      }
    );
  });
  accumulatedFlights = newAccumulations;
  return aircraft;
}

function getAESTISOString() {
  const now = new Date();
  // Get UTC time, then add 10 hours
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  // Format as ISO 8601 without Z (local time)
  return aest.toISOString().replace('Z', '+10:00');
}

async function correlateFlightRadar(flight) {
  const frApi = new flightradarapi.FlightRadar24API();
  let bounds = frApi.getBoundsByPoint(flight.lat, flight.lon, 1000);
  const frFlights = await frApi.getFlights(null, bounds);
  if (frFlights.length === 1) {
    return frFlights[0];
  }
  const rego = flight.r?.trim().toUpperCase();
  const matchingRego = frFlights.find(
    (frFlight) => String(frFlight.registration).toUpperCase() === rego
  );

  if (!matchingRego) {
    console.log(
      new Date().toUTCString(),
      "FlightRadar missing",
      rego,
      JSON.stringify(frFlights)
    );
  }
  return matchingRego;
}

export async function track() {
  console.log(new Date().toISOString(), "tracking...");
  const flights = await fetch(
    `https://opendata.adsb.fi/api/v2/lat/-27.4495399/lon/153.0486157/dist/${process.env.DISTANCE || 15}`
  ).then((res) => res.json());
  accumulateFlights(flights.aircraft);
  fs.writeFileSync(
    "flights.geo.json",
    JSON.stringify(makeGeoJson(flights.aircraft, bbox))
  );

  const overheadFlights = flights.aircraft.filter((aircraft) =>
    isInBoundingBox([aircraft.lon, aircraft.lat], bbox)
  );

  await Promise.all(overheadFlights.map(announceFlight));

}
