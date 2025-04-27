import titlecase from 'titlecase'



export function getAirline(flight) {
    if (!flight.ownOp) {
        return 'Unknown operator';
    }
    const operator = flight.ownOp.toUpperCase();

    if (flight.flight?.match(/^QF/)) {
        return 'Qantas'
    }

    return titlecase(operator.replace(/\sPTY\sLIMITED\.?/, '').replace(/\sPTY\LTD\.?/, '').toLowerCase());
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
        "type": "FeatureCollection",
        "features": [...flights.flatMap(flight => [
            (
                {
                    "type": "Feature",
                    "properties": flight,
                    "geometry": {
                        "coordinates": [flight.lon, flight.lat],
                        "type": "Point"
                    }
                }),
            flight.lineString?.length > 1 && {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "coordinates": flight.lineString,
                    "type": "LineString"
                }
            }
        ].filter(Boolean)),


        {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "coordinates": [
                    [
                        [
                            left,
                            top
                        ],
                        [
                            right,
                            top
                        ],
                        [
                            right,
                            bottom
                        ],
                        [
                            left,
                            bottom
                        ],
                        [
                            left,
                            top
                        ],
                    ]
                ],
                "type": "Polygon"
            }
        }]
    }
}
