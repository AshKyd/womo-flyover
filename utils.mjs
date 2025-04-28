import titlecase from "titlecase";
import airlines from "airline-codes";

export function articleise(word) {
  const vowels = ["a", "e", "i", "o", "u"];
  const letter = word.slice(0, 1).toLowerCase();
  if (vowels.includes(letter)) {
    return `an ${word}`;
  }
  return `a ${word}`;
}

export function getAirline(flight) {
  const icao = flight.flight?.slice(0, 3);
  const operatorFromCode = airlines.findWhere({ icao }).get("name");

  if (operatorFromCode) {
    return operatorFromCode;
  }

  if (!flight.ownOp) {
    return "Unknown operator";
  }

  const operator = flight.ownOp.toUpperCase();
  return titlecase(
    operator
      .replace(/\sPTY\sLIMITED\.?/, "")
      .replace(/\sPTY\sLTD\.?/, "")
      .replace(" LIMITED", "")
      .toLowerCase()
  );
}

export function sanitiseModel(model) {
  return titlecase(model || "unknown aircraft");
}

export function isInBoundingBox(point, boundingBox) {
  const [lng, lat] = point;
  const [top, right, bottom, left] = boundingBox;
  const isLatInbounds = lat <= top && lat >= bottom;
  const isLonInBounds = lng <= right && lng >= left;
  return isLatInbounds && isLonInBounds;
}

export function makeGeoJson(flights, bbox) {
  const [top, right, bottom, left] = bbox;
  return {
    type: "FeatureCollection",
    features: [
      ...flights.flatMap((flight) =>
        [
          {
            type: "Feature",
            properties: flight,
            geometry: {
              coordinates: [flight.lon, flight.lat],
              type: "Point",
            },
          },
          flight.lineString?.length > 1 && {
            type: "Feature",
            properties: {},
            geometry: {
              coordinates: flight.lineString,
              type: "LineString",
            },
          },
        ].filter(Boolean)
      ),

      {
        type: "Feature",
        properties: {},
        geometry: {
          coordinates: [
            [
              [left, top],
              [right, top],
              [right, bottom],
              [left, bottom],
              [left, top],
            ],
          ],
          type: "Polygon",
        },
      },
    ],
  };
}
