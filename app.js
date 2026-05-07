
require('dotenv').config();

// required imports from other files
const sql = require('mssql');
const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const app = express();
var getOrCreateUser = require('./database.js').dbGetOrCreateUser; // claire moved this up to the top for organization

var dbCities = require('./database.js').dbCities;
var dbQuiz = require('./database.js').dbQuiz;
var dbCityById = require('./database.js').dbCityById;
var dbSubmitQuiz = require('./database.js').dbSubmitQuiz;
var initDB = require('./database.js').initDB;
var getLeaderboard = require('./database.js').dbGetLeaderboard; //By Lily
var gamesPlayed = require('./database.js').dbGamesPlayed; //By Lily
var updateUserName = require('./database.js').dbUpdateUserName; //By Lily
var getCities = require('./database.js').dbGetCities; //By Lily
var searchLeaderboard = require('./database.js').dbSearchLeaderboard; //By Lily
var getOtherCities = require('./database.js').dbGetOtherCities; //By Lily

// import pool to use requests (needed until all requests moved to database.js)
var getPool = require('./database.js').getPool;

app.set('view engine', 'ejs');
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true })); // claire added this to parse requests with url encoded form data like profile edit

// Auth0 Configuration using dotenv
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

// claire added: get the current user's username. if not, get the nickname (part before the @ in their email)
function getPreferredUsername(user) {
    return (
        user?.username ||
        user?.nickname
    );
}

// claire added: if the user is logged in, get or create their db record and attach to res.locals
// makes currentuser visible for all views without passing manually
app.use(async (req, res, next) => {
    try {
        if (req.oidc.isAuthenticated()) {
            const sub = req.oidc.user.sub;
            const username = getPreferredUsername(req.oidc.user);
            res.locals.currentUser = await getOrCreateUser(sub, username);
        } else {
            res.locals.currentUser = null;
        }
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.locals.currentUser = null;
    }
    next();
});

//claire added: route to render the profile page
// help to get preferred username
app.get('/profile', requiresAuth(), async (req, res) => {
    const auth0_id = req.oidc.user.sub;
    // returns user if they exist, otherwise creates them & returns
    const user = await getOrCreateUser(
        auth0_id,
        getPreferredUsername(req.oidc.user)
    );
    // get number of games played
    const gameStats = await gamesPlayed(auth0_id);

    res.render('profile', {
        user: { ...user, gameStats },
        currentUser: user
    });
});

// claire added: handles profile form submission and updates user's username in the db when edited
app.post('/profile/edit', requiresAuth(), async (req, res) => {
    try {
        const auth0_id = req.oidc.user.sub;
        const { username } = req.body;
        await updateUserName(auth0_id, username);
        res.redirect('/profile');
    } catch (err) {
        console.error('Profile edit error:', err);
        res.status(500).json({ error: 'edit failed' });
    }
});

// render the world map when requested inside the iframe
app.get('/interactive-map', async (req, res) => {
    const cities = await dbCities();
    res.render('worldMap', { cities });
});

// Switch from map to quiz for input city when start button is pushed.
app.get('/quiz', async (req, res) => {
    const city = JSON.parse(req.query.city);
    const result = await dbQuiz(city);
    //console.log(result);
    res.render('quiz', result);
});
//Lily Added - Moves BuildChoices here to keep things server side
app.get("/api/quiz/choices/:cityId/:field", async (req, res) => {
    const { cityId, field } = req.params;
    const cityInfo = await dbCityById(cityId);
    const citiesTable = await getOtherCities(cityId);
    const correct = cityInfo[field];
    const seen = new Set([correct]);
    const wrongs = [];
    for (const c of citiesTable) {
        const v = c[field];
        if (v != null && !seen.has(v)) {
            seen.add(v);
            wrongs.push(v);
        }
    }
    const shuffledWrongs = wrongs.sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [correct, ...shuffledWrongs].sort(() => Math.random() - 0.5);
    res.json(choices);
});
//Lily added - Check Answer here to prevent cheating
app.get("/api/quiz/answer/:cityId/:field", async (req, res) => {
    const { cityId, field } = req.params;
    const cityInfo = await dbCityById(cityId);
    const correctValue = cityInfo[field];
    res.json(correctValue);
});

app.post('/quiz/submit', async (req, res) => {
    try {
        // ensure real data
        const { cityId, answers } = req.body || {};
        if (!Number.isInteger(cityId) || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'invalid payload' });
        }
        // get city info
        const city = await dbCityById(cityId);
        if (!city) {
            return res.status(404).json({ error: 'city not found' });
        }

        // calculate a score for each question
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

        // update score if user is logged in
        if (req.oidc.isAuthenticated()) {
            const auth0_id = req.oidc.user.sub;
            const result = await dbSubmitQuiz({ auth0_id, cityName: city.name, score });
            previousBest = result.previousBest;
            recorded = true;
        }

        // return quiz info back to client
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


// Main route including leaderboard
// TO DO: Move queries into database.js - Done!By Lily
app.get('/', async (req, res) => {
    try {
        const result = await getLeaderboard();
        const result2 = await getCities();
        res.render('home', {
            users: result,
            cities: result2
            // currentUser is already in res.locals from middleware, no need to pass it
        });
    } catch (err) {
        console.error('Home page error:', err);
        res.status(500).render('home', { users: [], cities: [], error: "Currently unable to load leaderboard." });
    }
});
//alternate leaderboard data so it doesn't have to refresh
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await getLeaderboard();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});

//Search users in Leaderboard function - By Lily
app.get("/api/leaderboard/search", async (req, res) => {
    const { name } = req.query;
    try {
        const search = await searchLeaderboard(name);
        res.json(search);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
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











