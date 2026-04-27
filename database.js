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

exports.getPool = () => pool;
exports.config = config;
exports.server = server;
exports.database = database;
exports.port = port;
exports.authenticationType = authenticationType;

// Initialize DB connection once
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

async function getQuiz(city) {
    try {
        if (!pool) {
            throw new Error("Database connection not established");
        }
        const result2 = await pool.request().query(`SELECT * FROM cities WHERE id != '${city.id}'`);
        const result = await pool.request().query('SELECT TOP 5 * FROM questions ORDER BY NEWID();');
        return { city: city, questions: result.recordset, cities: result2.recordset };
        //res.render('quiz', { city: city, questions: result.recordset, cities: result2.recordset });
    } catch (err) {
        console.error('Quiz Error:', err);
        return { city: city, questions: [], cities: [] };
        //res.status(500).render('quiz', { city: city, questions: [], cities: [], error: "Currently unable to load leaderboard." });
    }
}

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


exports.dbCities = getCities;
exports.dbQuiz = getQuiz;
exports.dbCityById = getCityById;
exports.dbSubmitQuiz = submitQuiz;