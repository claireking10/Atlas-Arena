//import sql from 'mssql';
const sql = require('mssql');
const express = require('express');
const app = express();

const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const authenticationType = process.env.AZURE_SQL_AUTHENTICATIONTYPE;

app.set('view engine', 'ejs');
app.use(express.static('public'))

// For system-assigned managed identity.
const config = {
    server,
    port,
    database,
    authentication: {
        type: authenticationType
    },
    options: {
        encrypt: true
    }
};  

let pool; // shared connection

// Initialize DB connection once
async function initDB() {
    try {
        pool = await sql.connect(config);
        console.log('Connected to database');
    } catch (err) {
        console.error('DB connection failed:', err);
    }
}

// Route: Top 5 users
app.get('/', async (req, res) => {

    try {
        if (!pool) {
            throw new Error("Database connection not established");
        }
        const result = await pool.request()
            .query('SELECT TOP 5 * FROM users ORDER BY totalScore DESC');
        const result2 = await pool.request()
            .query('SELECT * FROM citiesTest');
        res.render('home', { users: result.recordset, cities: result2.recordset });
    } catch (err) {
        console.error('Home page error:', err);
        res.status(500).render('home', { users: [], cities: [], error: "Currently unable to load leaderboard." });
    }
});

const serverPort = process.env.PORT || 3000;

async function startServer() {
    await initDB(); // ensure DB is ready first

    app.listen(serverPort, () => {
        console.log(`Server running on port ${serverPort}`);
    });
}

startServer();











