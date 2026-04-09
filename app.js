//import sql from 'mssql';
require('dotenv').config();
const sql = require('mssql');
const express = require('express');
const { auth } = require('express-openid-connect');
const app = express();

const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const authenticationType = process.env.AZURE_SQL_AUTHENTICATIONTYPE;

app.set('view engine', 'ejs');
app.use(express.static('public'))

// Auth0 Configuration uses dotenv stuff
const authConfig = {
    authRequired: false, // Don't force login for the home page
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    clientSecret: process.env.AUTH0_CLIENT_SECRET
};

// Initialize Auth0 router (this automatically creates /login and /logout routes)
app.use(auth(authConfig));

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

app.get('/interactive-map', (req, res) => {
    res.render('worldMap.ejs', { title: "Iframe Content" }); 
});



// Route: Top 5 users
app.get('/', async (req, res) => {
    try {
        if (!pool) {
            throw new Error("Database connection not established");
        }

        let currentUser = null;

        // 1. Check if the user is logged in via Auth0
        if (req.oidc.isAuthenticated()) {
            const { sub, nickname, name } = req.oidc.user;
            
            // 2. Check if this specific user is in your Azure SQL database
            const checkUser = await pool.request()
                .input('auth0_id', sql.VarChar, sub)
                .query('SELECT * FROM users WHERE auth0_id = @auth0_id');

            if (checkUser.recordset.length === 0) {
                // 3. New User: Insert them into the database and get the row back
                const insertUser = await pool.request()
                    .input('auth0_id', sql.VarChar, sub)
                    .input('username', sql.VarChar, nickname || name)
                    .query('INSERT INTO users (auth0_id, username, totalScore, showOnLeaderboard) OUTPUT INSERTED.* VALUES (@auth0_id, @username, 0, 1)');
                
                currentUser = insertUser.recordset[0];
            } else {
                // 4. Returning User: Grab their existing database record
                currentUser = checkUser.recordset[0];
            }
        }

        // 5. Fetch leaderboard (Top 5) and cities map data
        const result = await pool.request().query('SELECT TOP 5 * FROM users ORDER BY totalScore DESC');
        const result2 = await pool.request().query('SELECT * FROM citiesTest');
        
        // 6. Render the page, passing the user object to EJS
        res.render('home', { 
            users: result.recordset, 
            cities: result2.recordset,
            currentUser: currentUser // Pass this so EJS knows who is logged in
        });
    } catch (err) {
        console.error('Home page error:', err);
        res.status(500).render('home', { users: [], cities: [], currentUser: null, error: "Currently unable to load leaderboard." });
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











