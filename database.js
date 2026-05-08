// Azure required variables
const sql = require('mssql');
const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const authenticationType = process.env.AZURE_SQL_AUTHENTICATIONTYPE;

let pool; // shared connection

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

// end required variables


// export db variables to still allow queries in app.js (required until all queries moved.)
exports.getPool = () => pool;
exports.config = config;
exports.server = server;
exports.database = database;
exports.port = port;
exports.authenticationType = authenticationType;

// Initialize DB connection
async function initDB() {
    try {
        pool = await sql.connect(config);
        console.log('Connected to database');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

exports.initDB = initDB;

let cities;

// get all records from the cities table
async function getCities() {
    try {
        if (!pool) {
            throw new Error("Database connection not established");
        }
        const result = await pool.request().query('SELECT * FROM CITIES');
        return result.recordset;
    } catch (err) {
        console.error('Error retrieving cities: ', err);
        return [];
    }
}

// get random cities for answer choices and 5 random questions
async function getQuiz(city) {
    try {
        if (!pool) {
            throw new Error("Database connection not established");
        }
        const result2 = await pool.request().query(`SELECT * FROM cities WHERE id != '${city.id}'`);
        const result = await pool.request().query('SELECT TOP 5 * FROM questions ORDER BY NEWID();');
        return { city: city, questions: result.recordset, cities: result2.recordset };
    } catch (err) {
        console.error('Quiz Error:', err);
        return { city: city, questions: [], cities: [] };
    }
}

// return city data based on its id
async function getCityById(id) {
    try {
        if (!pool) {
            throw new Error("Database connection not established");
        }
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM cities WHERE id = @id');
        return result.recordset[0] || null;
    } catch (err) {
        console.error('Error fetching city by id:', err);
        return null;
    }
}

// insert data into the users table based on the auth0id, which city, and the score.
async function submitQuiz({ auth0_id, cityName, score }) {
    if (!pool) {
        throw new Error("Database connection not established");
    }
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
        const prev = await new sql.Request(tx)
            .input('auth0_id', sql.NVarChar, auth0_id)
            .input('city_name', sql.NVarChar, cityName)
            .query('SELECT MAX(score) AS prevBest FROM quiz_scores WHERE auth0_id = @auth0_id AND city_name = @city_name');
        const previousBest = prev.recordset[0].prevBest || 0;

        await new sql.Request(tx)
            .input('auth0_id', sql.NVarChar, auth0_id)
            .input('city_name', sql.NVarChar, cityName)
            .input('score', sql.Int, score)
            .query('INSERT INTO quiz_scores (auth0_id, city_name, score) VALUES (@auth0_id, @city_name, @score)');

        await new sql.Request(tx)
            .input('auth0_id', sql.NVarChar, auth0_id)
            .query(`
                UPDATE users
                SET totalScore = (
                    SELECT COALESCE(SUM(best), 0) FROM (
                        SELECT MAX(score) AS best
                        FROM quiz_scores
                        WHERE auth0_id = @auth0_id
                        GROUP BY city_name
                    ) AS bests
                )
                WHERE auth0_id = @auth0_id
            `);

        await tx.commit();
        return { previousBest };
    } catch (err) {
        await tx.rollback();
        throw err;
    }
}

// claire added 
// get or create user
// Create user if they don't exist, otherwise just return their data from DB
async function getOrCreateUser(auth0_id, username) {
    if (!pool) throw new Error("Database connection not established");

    // only inserts if the user doesn't exist yet — never overwrites username
    await pool.request()
        .input('auth0_id', sql.NVarChar, auth0_id)
        .input('username', sql.NVarChar, username)
        .query(`
            IF NOT EXISTS (SELECT 1 FROM users WHERE auth0_id = @auth0_id)
                INSERT INTO users (auth0_id, username, totalScore, createdAt)
                VALUES (@auth0_id, @username, 0, GETDATE())
        `);

    const result = await pool.request()
        .input('auth0_id', sql.NVarChar, auth0_id)
        .query('SELECT * FROM users WHERE auth0_id = @auth0_id');

    return result.recordset[0];
}

async function getLeaderboard() { //By Lily
    if (!pool) throw new Error("Database connection not established");
    const result = await pool.request().query('SELECT * FROM users ORDER BY totalScore DESC');
    return result.recordset
}

async function gamesPlayed(auth0_id) { //By Lily
    if (!pool) throw new Error("Database connection not established");
    const result = await pool.request()
        .input('auth0_id', sql.NVarChar, auth0_id)
        .query('SELECT COUNT(*) AS gamesPlayed FROM quiz_scores WHERE auth0_id = @auth0_id');
    return result.recordset[0].gamesPlayed;
}

async function updateUserName(auth0_id, username) { //By Lily
    if (!pool) throw new Error("Database connection not established");
    await pool.request()
        .input('auth0_id', sql.NVarChar, auth0_id)
        .input('username', sql.NVarChar, username)
        .query('UPDATE users SET username = @username WHERE auth0_id = @auth0_id');
}

async function searchLeaderboard(username) { //By Lily
    if (!pool) throw new Error("Database connection not established");
    const result = await pool.request()
        .input('username', sql.NVarChar, `%${username}%`)
        .query('SELECT * FROM users WHERE username LIKE @username ORDER BY totalScore DESC');
    return result.recordset;
}

async function getOtherCities(cityId) { //By Lily
    if (!pool) throw new Error("Database connection not established");
    const results = await pool.request()
        .input('cityId', sql.Int, cityId)
        .query(`SELECT * FROM cities WHERE id != @cityId`);
    return results.recordset;
}

// export functions to app.js
exports.dbCities = getCities;
exports.dbQuiz = getQuiz;
exports.dbCityById = getCityById;
exports.dbSubmitQuiz = submitQuiz;
exports.dbGetOrCreateUser = getOrCreateUser; //By Claire
exports.dbGetLeaderboard = getLeaderboard; //By Lily
exports.dbGamesPlayed = gamesPlayed; //By Lily
exports.dbUpdateUserName = updateUserName; //By Lily
exports.dbGetCities = getCities; //By Lily
exports.dbSearchLeaderboard = searchLeaderboard; //By Lily
exports.dbGetOtherCities = getOtherCities; //By Lily
