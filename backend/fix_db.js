const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ltc_db',
  password: 'Pppp0000@',
  port: 5432,
});

async function fix() {
  try {
    await pool.query("ALTER TABLE evaluations ADD COLUMN schedule_id INT");
    console.log("Column schedule_id added successfully!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fix();
