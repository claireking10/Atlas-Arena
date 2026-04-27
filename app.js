
require('dotenv').config();

const sql = require('mssql');
const express = require('express');
const { auth } = require('express-openid-connect');
const app = express();

var dbCities = require('./database.js').dbCities;
var dbQuiz = require('./database.js').dbQuiz;
var dbCityById = require('./database.js').dbCityById;
var dbSubmitQuiz = require('./database.js').dbSubmitQuiz;
var initDB = require('./database.js').initDB;

app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(express.json())

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


var getPool = require('./database.js').getPool;

app.get('/interactive-map', async (req, res) => {
    const cities = await dbCities();
    res.render('worldMap', { cities });
});

app.get('/quiz', async (req, res) => { // called when start quiz button is pushed.
    const city = JSON.parse(req.query.city);
    const result = await dbQuiz(city);
    //console.log(result);
    res.render('quiz', result);
});

app.post('/quiz/submit', async (req, res) => {
    try {
        const { cityId, answers } = req.body || {};
        if (!Number.isInteger(cityId) || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'invalid payload' });
        }

        const city = await dbCityById(cityId);
        if (!city) {
            return res.status(404).json({ error: 'city not found' });
        }

        const perQuestion = answers.slice(0, 5).map(a => {
            const field = String(a && a.field || '');
            const correctValue = city[field];
            const isCorrect = correctValue != null && a.selectedAnswer === correctValue;
            const elapsedMs = Math.max(0, Number(a && a.elapsedMs) || 0);
            const points = isCorrect ? Math.max(20, Math.round(100 - elapsedMs / 200)) : 0;
            return { field, correct: isCorrect, points, elapsedMs };
        });
        const score = perQuestion.reduce((s, q) => s + q.points, 0);

        let recorded = false;
        let previousBest = 0;
        if (req.oidc.isAuthenticated()) {
            const auth0_id = req.oidc.user.sub;
            const result = await dbSubmitQuiz({ auth0_id, cityName: city.name, score });
            previousBest = result.previousBest;
            recorded = true;
        }

        res.json({
            recorded,
            score,
            perQuestion,
            previousBest,
            isNewHighScore: recorded && score > previousBest
        });
    } catch (err) {
        console.error('Quiz submit error:', err);
        res.status(500).json({ error: 'submit failed' });
    }
});


// Route: Top 5 users
app.get('/', async (req, res) => {
    const pool = getPool();
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
        const result2 = await pool.request().query('SELECT * FROM cities');
        
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



const serverPort = process.env.PORT || 1433;

async function startServer() {
    await initDB(); // ensure DB is ready first

    app.listen(serverPort, () => {
        console.log(`Server running on port ${serverPort}`);
    });
}

startServer();











