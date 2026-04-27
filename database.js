//require('dotenv').config();
const sql = require('mssql');


const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const authenticationType = process.env.AZURE_SQL_AUTHENTICATIONTYPE;

//console.log('authType:', JSON.stringify(authenticationType));


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
        const result2 = await pool.request().query(`SELECT * FROM cities WHERE name != '${city.name}'`);
        const result = await pool.request().query('SELECT TOP 5 * FROM questions ORDER BY NEWID();');
        return { city: city, questions: result.recordset, cities: result2.recordset };
        //res.render('quiz', { city: city, questions: result.recordset, cities: result2.recordset });
    } catch (err) {
        console.error('Quiz Error:', err);
        return { city: city, questions: [], cities: [] };
        //res.status(500).render('quiz', { city: city, questions: [], cities: [], error: "Currently unable to load leaderboard." });
    }
}




exports.dbCities = getCities;
exports.dbQuiz = getQuiz;








//
//var mysql = require('mysql2');
//
//require('dotenv').config();
//
//var connection = mysql.createConnection({
//    host : process.env.DATABASE_HOST,
//    user : process.env.DATABASE_USER,
//    password : process.env.DATABASE_PASSWORD,
//    database : process.env.DATABASE_NAME
//});
//connection.connect((err => {
//    if(err) throw err;
//    console.log('MySQL Connected');
//}));
//
//exports.databaseConnection = connection;
//
//