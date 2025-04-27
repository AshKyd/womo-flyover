# ✈️ WOMO Flyover

A Node.js application that tracks aircraft flying over South Brisbane (West of Montague/WOMO) and posts updates to Mastodon. The application monitors aircraft using ADS-B data from [adsb.fi](https://opendata.adsb.fi) and correlates it with FlightRadar24 data to provide detailed information about passing aircraft.

## Installation

1. Clone the repository:
2. Install dependencies: `npm i`
3. Create a `.env` file based on `.env-example` or specify environment variables on the command line.

## Configuration

Edit the `.env` file with your credentials:

- `ACCESS_TOKEN`: Your Mastodon bot API access token
- `MASTODON_SERVER`: Your Mastodon instance URL (e.g., "https://bne.social")

## Operation

The application runs continuously, checking for aircraft every 30 seconds. When an aircraft is detected within the defined bounding box, it will:

1. Correlate the aircraft with FlightRadar24 data
2. Generate a message with flight details (airline, aircraft type, flight number, origin, and destination)
3. Post the update to Mastodon
4. Generate GeoJSON data for visualization (not used)

To start the application:
```bash
node index.mjs
```
