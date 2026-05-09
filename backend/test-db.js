const { Client } = require('pg');

async function resetAdmin() {
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
    const res = await client.query("DELETE FROM users WHERE role = 'admin'");
    console.log('Admin user deleted. Rows affected:', res.rowCount);
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

resetAdmin();
