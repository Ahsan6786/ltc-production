const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = 5001;
const SECRET = 'ltc-super-secret-key-for-now';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ltc_db',
  password: 'Pppp0000@',
  port: 5432,
});

// Initialize database schema and Super Admin
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        semester VARCHAR(50)
      );
    `);

    // Add new columns to users for Program Management Structure safely
    const alterQueries = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS division VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS panel VARCHAR(50)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS prn VARCHAR(100) UNIQUE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(100) UNIQUE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(50)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS program VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS year VARCHAR(20)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS nri BOOLEAN DEFAULT false",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS red_flag BOOLEAN DEFAULT false",
      "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS category VARCHAR(100)",
      "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS additional_notes TEXT",
      "ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS marking_scheme VARCHAR(50)"
    ];
    for (const q of alterQueries) {
      try { await pool.query(q); } catch (e) { /* ignore if already exists or syntax unsupported in old PG */ }
    }

    // Additional tables for PM system
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        date VARCHAR(50),
        time VARCHAR(50),
        faculty_id INT,
        panel VARCHAR(50)
      );
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        schedule_id INT,
        student_id INT,
        status VARCHAR(50)
      );
      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        student_id INT,
        faculty_id INT,
        schedule_id INT,
        marks INT,
        remarks TEXT,
        report_url TEXT,
        photo_url TEXT
      );
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INT,
        role VARCHAR(50),
        feedback_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        url TEXT,
        uploaded_by INT,
        target_role VARCHAR(50)
      );
      CREATE TABLE IF NOT EXISTS insurance (
        id SERIAL PRIMARY KEY,
        prn VARCHAR(100) UNIQUE,
        policy_number VARCHAR(255),
        provider VARCHAR(255)
      );
    `);


    const adminQuery = await pool.query("SELECT * FROM users WHERE role = 'admin'");
    if (adminQuery.rowCount === 0) {
      const hashedPassword = await bcrypt.hash('123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['Super Admin', 'admin@ltc.edu', hashedPassword, 'admin']
      );
      console.log('Super Admin initialized in PostgreSQL: admin@ltc.edu (123)');
    } else {
      console.log('PostgreSQL database ready. Super Admin already exists.');
    }
  } catch (err) {
    console.error('Database Initialization Error:', err);
  }
};
initDB();

// Middleware for auth
const authMiddleware = (roles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ message: 'Unauthorized role' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Login Route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userQuery.rowCount === 0) return res.status(400).json({ message: 'User not found' });

    const user = userQuery.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, department: user.department, panel: user.panel }, SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, department: user.department, panel: user.panel, division: user.division, school: user.school } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin Route: Add Faculty
app.post('/api/admin/faculty', authMiddleware(['admin']), async (req, res) => {
  const { name, email, department, division, school, panel, is_primary } = req.body;

  try {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newFaculty = await pool.query(
      "INSERT INTO users (name, email, password, role, department, division, school, panel, is_primary) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role, department, division, school, panel, is_primary",
      [name, email, hashedPassword, 'faculty', department, division || null, school || null, panel || null, is_primary === true || is_primary === 'true']
    );

    res.status(201).json({ message: 'Faculty created successfully. Default password is password123.', faculty: newFaculty.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'User already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin/Faculty Route: Add Student
app.post('/api/users/student', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { name, email, semester, department, division, school, panel } = req.body;

  try {
    const defaultPassword = 'student123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newStudent = await pool.query(
      "INSERT INTO users (name, email, password, role, semester, department, division, school, panel) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role, semester, department, division, school, panel",
      [name, email, hashedPassword, 'student', semester, department, division || null, school || null, panel || null]
    );

    res.status(201).json({ message: 'Student created successfully. Default password is student123.', student: newStudent.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'User already exists' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// API Dashboard Routes
app.get('/api/faculty/dashboard', authMiddleware(['faculty']), async (req, res) => {
  try {
    const panels = (req.user.panel || '').split(',').map(p => p.trim()).filter(Boolean);
    let myStudents;
    if (panels.length > 0) {
      myStudents = await pool.query(
        "SELECT id, name, email, semester, department, panel, nri, red_flag FROM users WHERE role = 'student' AND panel = ANY($1)",
        [panels]
      );
    } else {
      // Fallback if no specific panel assigned
      myStudents = await pool.query(
        "SELECT id, name, email, semester, department, panel, nri, red_flag FROM users WHERE role = 'student' AND department = $1",
        [req.user.department]
      );
    }
    res.json({ message: 'Welcome Faculty', data: myStudents.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/faculty/toggle-red-flag', authMiddleware(['faculty']), async (req, res) => {
  const { student_id } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET red_flag = NOT COALESCE(red_flag, false) WHERE id = $1 RETURNING red_flag",
      [student_id]
    );
    res.json({ success: true, red_flag: result.rows[0].red_flag });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle red flag', error: err.message });
  }
});

app.get('/api/student/dashboard', authMiddleware(['student']), async (req, res) => {
  try {
    const myData = await pool.query(`
      SELECT u.id, u.name, u.email, u.semester, u.department, u.prn, u.red_flag,
             (i.prn IS NOT NULL) as insured
      FROM users u
      LEFT JOIN insurance i ON u.prn = i.prn
      WHERE u.id = $1
    `, [req.user.id]);
    res.json({ message: 'Welcome Student', data: myData.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/admin/dashboard', authMiddleware(['admin']), async (req, res) => {
  try {
    const allFaculties = await pool.query("SELECT id, name, email, department FROM users WHERE role = 'faculty'");
    const allStudents = await pool.query("SELECT id, name, email, semester, department FROM users WHERE role = 'student'");
    res.json({ message: 'Welcome Admin', faculties: allFaculties.rows, students: allStudents.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/admin/users', authMiddleware(['admin']), async (req, res) => {
  try {
    const allUsers = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.semester, 
             u.division, u.school, u.panel, u.is_primary, u.prn,
             (i.prn IS NOT NULL) as insured
      FROM users u
      LEFT JOIN insurance i ON u.prn = i.prn
      ORDER BY u.id ASC
    `);
    res.json({ users: allUsers.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/admin/update-panel', authMiddleware(['admin']), async (req, res) => {
  const { user_id, panel } = req.body;
  try {
    await pool.query("UPDATE users SET panel = $1 WHERE id = $2", [panel, user_id]);
    res.json({ message: 'Panel successfully updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.put('/api/admin/update-division', authMiddleware(['admin']), async (req, res) => {
  const { user_id, division } = req.body;
  try {
    await pool.query("UPDATE users SET division = $1 WHERE id = $2", [division || null, user_id]);
    res.json({ message: 'Division successfully updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/bulk-upload', authMiddleware(['admin']), async (req, res) => {
  const { users } = req.body;

  if (!Array.isArray(users)) {
    return res.status(400).json({ message: 'Users must be an array' });
  }

  try {
    const results = [];
    const errors = [];

    for (const u of users) {
      try {
        const password = u.role === 'faculty' ? 'password123' : 'student123';
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
          `INSERT INTO users (
            name, email, password, role, department, semester, 
            division, school, panel, is_primary, prn, faculty_id, 
            phone, dob, gender, program, year, designation, status, nri
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
          [
            u.name || u.full_name,
            u.email,
            hashedPassword,
            (u.role || 'student').toLowerCase(),
            u.department || null,
            u.semester || u.year || null,
            u.division || null,
            u.school || null,
            (u.panel || '').trim().toUpperCase() || null,
            u.is_primary === 'true' || u.is_primary === true || u.role === 'primary',
            u.prn || null,
            u.faculty_id || null,
            u.phone || null,
            u.dob || null,
            u.gender || null,
            u.program || null,
            u.year || u.semester || null,
            u.designation || null,
            u.status || 'active',
            (u.nri === true || u.nri === 1 ||
             String(u.nri).toLowerCase().trim() === 'yes' ||
             String(u.nri).toLowerCase().trim() === 'true' ||
             String(u.nri).toLowerCase().trim() === '1')
          ]
        );
        results.push(u.email);
      } catch (err) {
        errors.push({ email: u.email, error: err.message });
      }
    }

    res.status(201).json({ message: `Successfully added ${results.length} users.`, results, errors });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.post('/api/admin/insurance-bulk-upload', authMiddleware(['admin']), async (req, res) => {
  const { insuranceData } = req.body;
  if (!Array.isArray(insuranceData)) {
    return res.status(400).json({ message: 'Data must be an array' });
  }
  try {
    const results = [];
    const errors = [];
    for (const item of insuranceData) {
      try {
        const prn = String(item.prn || item.PRN || '').trim();
        if (!prn) throw new Error('Missing PRN');

        await pool.query(
          "INSERT INTO insurance (prn, policy_number, provider) VALUES ($1, $2, $3) ON CONFLICT (prn) DO UPDATE SET policy_number = EXCLUDED.policy_number, provider = EXCLUDED.provider",
          [prn, item.policy_number || item.policy || null, item.provider || null]
        );
        results.push(prn);
      } catch (err) {
        errors.push({ prn: item.prn, error: err.message });
      }
    }
    res.status(201).json({ message: `Processed ${results.length} insurance records.`, results, errors });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PM System Extended Routes
app.post('/api/documents', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { name, url, target_role } = req.body;
  try {
    const doc = await pool.query(
      "INSERT INTO documents (name, url, uploaded_by, target_role) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, url, req.user.id, target_role]
    );
    res.json({ message: 'Document uploaded', document: doc.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/documents', authMiddleware(), async (req, res) => {
  try {
    let docs;
    if (req.user.role === 'admin') {
      docs = await pool.query("SELECT * FROM documents");
    } else {
      docs = await pool.query("SELECT * FROM documents WHERE target_role = $1 OR target_role = 'all'", [req.user.role]);
    }
    res.json({ documents: docs.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Scheduling
app.post('/api/faculty/schedule', authMiddleware(['faculty']), async (req, res) => {
  const { title, date, time, panel } = req.body;
  try {
    await pool.query("INSERT INTO schedules (title, date, time, faculty_id, panel) VALUES ($1, $2, $3, $4, $5)",
      [title, date, time, req.user.id, panel]);
    res.json({ message: 'Schedule created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.delete('/api/faculty/schedule/:id', authMiddleware(['faculty']), async (req, res) => {
  try {
    const { id } = req.params;
    // Ensure the faculty owns this schedule
    const check = await pool.query("SELECT * FROM schedules WHERE id = $1 AND faculty_id = $2", [id, req.user.id]);
    if (check.rowCount === 0) return res.status(403).json({ message: 'Unauthorized or schedule not found' });

    // Delete attendance and evaluations for this schedule first to maintain integrity
    await pool.query("DELETE FROM attendance WHERE schedule_id = $1", [id]);
    await pool.query("DELETE FROM evaluations WHERE schedule_id = $1", [id]);
    await pool.query("DELETE FROM schedules WHERE id = $1", [id]);

    res.json({ message: 'Schedule and associated records deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/schedules', authMiddleware(), async (req, res) => {
  try {
    let query;
    if (req.user.role === 'admin') {
      query = await pool.query("SELECT * FROM schedules ORDER BY date DESC, time DESC");
    } else if (req.user.role === 'faculty') {
      query = await pool.query("SELECT * FROM schedules WHERE faculty_id = $1 ORDER BY date DESC, time DESC", [req.user.id]);
    } else {
      // Students handled by separate endpoint, but as fallback:
      query = await pool.query("SELECT * FROM schedules WHERE panel = 'ALL' OR panel = $1", [req.user.panel || 'Unassigned']);
    }
    res.json({ schedules: query.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Evaluations
app.post('/api/faculty/evaluate', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { student_id, schedule_id, marks, remarks, report_url, photo_url, marking_scheme } = req.body;
  try {
    await pool.query(
      "INSERT INTO evaluations (student_id, faculty_id, schedule_id, marks, remarks, report_url, photo_url, marking_scheme) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [student_id, req.user.id, schedule_id, marks, remarks, report_url || null, photo_url || null, marking_scheme || null]
    );
    res.json({ message: 'Evaluation submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/faculty/evaluations', authMiddleware(['admin', 'faculty']), async (req, res) => {
  try {
    let evals;
    if (req.user.role === 'admin') {
      evals = await pool.query("SELECT * FROM evaluations");
    } else {
      evals = await pool.query("SELECT * FROM evaluations WHERE faculty_id = $1", [req.user.id]);
    }
    res.json({ evaluations: evals.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Attendance
app.get('/api/faculty/attendance_records', authMiddleware(['admin', 'faculty']), async (req, res) => {
  try {
    let att;
    if (req.user.role === 'admin') {
      att = await pool.query("SELECT * FROM attendance");
    } else {
      // Only return attendance for events created by this faculty
      att = await pool.query(`
        SELECT a.* 
        FROM attendance a
        JOIN schedules s ON a.schedule_id = s.id
        WHERE s.faculty_id = $1
      `, [req.user.id]);
    }
    res.json({ records: att.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/faculty/attendance', authMiddleware(['admin', 'faculty']), async (req, res) => {
  const { schedule_id, student_id, status } = req.body;
  try {
    await pool.query("INSERT INTO attendance (schedule_id, student_id, status) VALUES ($1, $2, $3)", [schedule_id, student_id, status]);
    res.json({ message: 'Attendance marked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign Student Panel
app.put('/api/faculty/assign-panel', authMiddleware(['faculty']), async (req, res) => {
  const { student_id, panel } = req.body;
  try {
    await pool.query("UPDATE users SET panel = $1 WHERE id = $2 AND role = 'student'", [panel, student_id]);
    res.json({ message: 'Panel updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Student Facing API Routes
app.get('/api/student/schedules', authMiddleware(['student']), async (req, res) => {
  try {
    const schedules = await pool.query("SELECT * FROM schedules WHERE panel = 'ALL' OR panel = $1", [req.user.panel || 'Unassigned']);
    res.json({ schedules: schedules.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/student/attendance', authMiddleware(['student']), async (req, res) => {
  try {
    const att = await pool.query(`
      SELECT a.status, s.title, s.date 
      FROM attendance a 
      JOIN schedules s ON a.schedule_id = s.id 
      WHERE a.student_id = $1
    `, [req.user.id]);
    res.json({ attendance: att.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/student/evaluations', authMiddleware(['student']), async (req, res) => {
  try {
    const evals = await pool.query(`
      SELECT e.*, s.title as activity_title 
      FROM evaluations e
      LEFT JOIN schedules s ON e.schedule_id = s.id
      WHERE e.student_id = $1
    `, [req.user.id]);
    res.json({ evaluations: evals.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Profile Management
app.get('/api/me', authMiddleware(), async (req, res) => {
  try {
    const user = await pool.query("SELECT id, name, email, role, department, semester, division, school, panel, is_primary FROM users WHERE id = $1", [req.user.id]);
    res.json({ user: user.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/me', authMiddleware(), async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    const user = userResult.rows[0];

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password is required to set a new one.' });
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Incorrect current password.' });

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await pool.query("UPDATE users SET name = $1, password = $2 WHERE id = $3", [name || user.name, hashedNew, req.user.id]);
    } else {
      await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name || user.name, req.user.id]);
    }

    res.json({ message: 'Profile successfully updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Feedback Routes
app.post('/api/feedback', authMiddleware(['student', 'faculty']), async (req, res) => {
  const { feedback_text, category, additional_notes } = req.body;
  try {
    await pool.query(
      "INSERT INTO feedback (user_id, role, feedback_text, category, additional_notes) VALUES ($1, $2, $3, $4, $5)",
      [req.user.id, req.user.role, feedback_text, category || 'General', additional_notes || null]
    );
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/admin/feedback', authMiddleware(['admin']), async (req, res) => {
  const { user_id } = req.query;
  try {
    let query = `SELECT f.*, u.name, u.email 
                 FROM feedback f 
                 JOIN users u ON f.user_id = u.id`;
    let params = [];
    if (user_id) {
      query += ` WHERE f.user_id = $1`;
      params.push(user_id);
    }
    query += ` ORDER BY f.created_at DESC`;
    
    const feedback = await pool.query(query, params);
    res.json({ feedback: feedback.rows });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
