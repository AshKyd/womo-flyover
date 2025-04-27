import titlecase from 'titlecase'

const flightCodes = {
    SIA: 'Singapore Airlines',
    QF: 'Qantas',
    VOZ: "Virgin Australia",
}


export function getAirline(flight) {
    const operator = flight.ownOp.toUpperCase();

    const [_code, operatorFromCode] = Object.entries(flightCodes).find(([code]) => flight.flight?.slice(0, code.length) === code) || [];

    if (operatorFromCode) {
        return operatorFromCode;
    }

    if (!flight.ownOp) {
        return 'Unknown operator';
    }

    return titlecase(operator.replace(/\sPTY\sLIMITED\.?/, '').replace(/\sPTY\sLTD\.?/, '').replace(' LIMITED').toLowerCase());
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
