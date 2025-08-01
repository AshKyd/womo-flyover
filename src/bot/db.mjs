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

const dbReady = (async () => {
    // Helper to wrap db.run in a Promise
    function runAsync(sql) {
        return new Promise((resolve, reject) => {
            db.run(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    try {
        await runAsync(`
        CREATE TABLE IF NOT EXISTS locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          name TEXT NOT NULL,
          elevation INTEGER
        )
        `);
        // Drop aircrafts table for debugging
        await runAsync(`
        CREATE TABLE IF NOT EXISTS aircrafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          model TEXT,
          airline TEXT,
          category TEXT,
          year TEXT,
          ownOp TEXT,
          elevation INTEGER
        )
        `);

        // Add elevation column to locations table if it doesn't exist
        try {
            await runAsync(`ALTER TABLE locations ADD COLUMN elevation INTEGER`);
        } catch (err) {
            // Column might already exist, which is fine
            console.log('Elevation column already exists or could not be added:', err.message);
        }

        console.log('Tables "locations" and "aircrafts" ready.');
    } catch (err) {
        console.error("Table creation error:", err.message);
        throw err;
    }
})();

/**
 * Insert a row into the "locations" table.
 * @param {string} timestamp - ISO 8601 datetime (e.g., "2025-07-28T14:30:00")
 * @param {number} latitude
 * @param {number} longitude
 * @param {string} name
 * @param {number} elevation - Barometric altitude in feet
 */
async function insertRow(timestamp, latitude, longitude, name, elevation) {
    await dbReady;
    const sql = `INSERT INTO locations (timestamp, latitude, longitude, name, elevation) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [timestamp, latitude, longitude, name, elevation], function (err) {
        if (err) {
            console.error("Insert error:", err.message);
        }
    });
}

/**
 * Query all rows between two ISO 8601 timestamps, grouped by name.
 * @param {string} startTimestamp
 * @param {string} endTimestamp
 * @returns {Promise<{[name: string]: {lineString: number[][]}}>} groupedData
 */
async function getRowsByDateRange(startTimestamp, endTimestamp) {
    await dbReady;
    const sql = `
        SELECT * FROM locations
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
    `;
    return new Promise((resolve, reject) => {
        db.all(sql, [startTimestamp, endTimestamp], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Group rows by name
                const groupedData = {};
                rows.forEach(row => {
                    if (!groupedData[row.name]) {
                        groupedData[row.name] = { lineString: [] };
                    }
                    groupedData[row.name].lineString.push([
                        Number(row.longitude.toFixed(4)),
                        Number(row.latitude.toFixed(4)),
                        row.elevation || -1
                    ]);
                });
                resolve(groupedData);
            }
        });
    });
}

/**
 * Get the first and last available dates in the locations table (async).
 * @returns {Promise<{firstDate: string, lastDate: string}>}
 */
async function getAvailableDateRange() {
    await dbReady;
    const sql = `
        SELECT 
            MIN(DATE(timestamp)) as firstDate, 
            MAX(DATE(timestamp)) as lastDate 
        FROM locations
    `;
    return new Promise((resolve, reject) => {
        db.get(sql, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve({ firstDate: row.firstDate, lastDate: row.lastDate });
            }
        });
    });
}

/**
 * Create or update an aircraft row by name.
 * @param {Object} aircraft - { name, model, airline, category, year, ownOp }
 * @param {Function} callback - Receives (err)
 */
async function updateAircraft(aircraft, callback) {
    await dbReady;
    const sql = `
        INSERT INTO aircrafts (name, model, airline, category, year, ownOp)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
            name=excluded.name,
            model=excluded.model,
            airline=excluded.airline,
            category=excluded.category,
            year=excluded.year,
            ownOp=excluded.ownOp
    `;
    db.run(
        sql,
        [
            aircraft.name,
            aircraft.model,
            aircraft.airline,
            aircraft.category,
            aircraft.year,
            aircraft.ownOp
        ],
        callback
    );
}

/**
 * Get all aircrafts that were seen in the given date range.
 * @param {string} startTimestamp
 * @param {string} endTimestamp
 * @returns {Promise<Array>} Array of aircrafts
 */
async function getAircraftsByDateRange(startTimestamp, endTimestamp) {
    await dbReady;
    const sql = `
        SELECT DISTINCT a.name, a.model, a.airline, a.category, a.year, a.ownOp
        FROM aircrafts a
        JOIN locations l ON a.name = l.name
        WHERE l.timestamp >= ? AND l.timestamp <= ?
    `;
    return new Promise((resolve, reject) => {
        db.all(sql, [startTimestamp, endTimestamp], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Example usage (uncomment to test):
// insertRow('2025-07-28T14:30:00', 40.7128, -74.0060, 'NYC');
// getRowsByDateRange('2025-07-28T00:00:00', '2025-07-28T23:59:59', console.log);

// Export functions
export { insertRow, getRowsByDateRange, getAvailableDateRange, updateAircraft, getAircraftsByDateRange, dbReady };
