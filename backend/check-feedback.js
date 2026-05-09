const { Client } = require('pg');

async function checkFeedback() {
  const client = new Client({
    user: 'postgres',
    password: 'Pppp0000@',
    host: 'localhost',
    port: 5432,
    database: 'ltc_db',
  });

  try {
    await client.connect();
    console.log('Connected to ltc_db');
    const res = await client.query("SELECT count(*) FROM feedback");
    console.log('Feedback count:', res.rows[0].count);
    const res2 = await client.query("SELECT * FROM feedback LIMIT 5");
    console.log('Sample Feedback:', res2.rows);
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkFeedback();
