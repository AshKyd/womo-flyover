import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// Resolve current directory (since __dirname doesn't exist in ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize and connect to the database
const dbPath =
    process.env.DB_PATH || path.resolve(__dirname, "../../", "flights.db");
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("DB connection error:", err.message);
    } else {
        console.log("Connected to SQLite DB.");
    }
});

// Create table with timestamp column
db.serialize(() => {
    db.run(
        `
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            name TEXT NOT NULL
        )
    `,
        (err) => {
            if (err) {
                console.error("Table creation error:", err.message);
            } else {
                console.log('Table "locations" ready.');
            }
        }
    );
});

/**
 * Insert a row into the "locations" table.
 * @param {string} timestamp - ISO 8601 datetime (e.g., "2025-07-28T14:30:00")
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} name
 */
function insertRow(timestamp, latitude, longitude, name) {
    const sql = `INSERT INTO locations (timestamp, latitude, longitude, name) VALUES (?, ?, ?, ?)`;
    db.run(sql, [timestamp, latitude, longitude, name], function (err) {
        if (err) {
            console.error("Insert error:", err.message);
        }
    });
}

/**
 * Query all rows between two ISO 8601 timestamps, grouped by name.
 * @param {string} startTimestamp
 * @param {string} endTimestamp
 * @param {Function} callback - Receives (err, groupedData) where groupedData is {[name]: [[lon, lat], [lon, lat], ...]}
 */
function getRowsByDateRange(startTimestamp, endTimestamp, callback) {
    const sql = `
        SELECT * FROM locations
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
    `;
    db.all(sql, [startTimestamp, endTimestamp], (err, rows) => {
        if (err) {
            callback(err, null);
        } else {
            // Group rows by name
            const groupedData = {};
            rows.forEach(row => {
                if (!groupedData[row.name]) {
                    groupedData[row.name] = { lineString: [] };
                }
                groupedData[row.name].lineString.push([
                    Number(row.longitude.toFixed(4)),
                    Number(row.latitude.toFixed(4))
                ]);
            });
            callback(null, groupedData);
        }
    });
}

// Example usage (uncomment to test):
// insertRow('2025-07-28T14:30:00', 40.7128, -74.0060, 'NYC');
// getRowsByDateRange('2025-07-28T00:00:00', '2025-07-28T23:59:59', console.log);

// Export functions
export { insertRow, getRowsByDateRange };
