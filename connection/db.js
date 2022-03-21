const { Pool } = require('pg');

//set connection pool
const dbPool = new Pool({
    database: 'db',
    port: '5432',
    user: 'postgres',
    password: 'root',
});

// export db pool
module.exports = dbPool;