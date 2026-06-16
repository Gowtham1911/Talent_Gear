require("dotenv").config();
const mysql = require("mysql2/promise");

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
  });

  process.stdout.write("Connected to MySQL\n");

  await conn.query("CREATE DATABASE IF NOT EXISTS `Talent_Gear`");
  process.stdout.write("Database Talent_Gear ready\n");

  await conn.query("USE `Talent_Gear`");

  const tables = [
    {
      name: "users",
      sql: `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin','employee','student') DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`,
    },
    {
      name: "jobs",
      sql: `CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT NOT NULL,
        location VARCHAR(255),
        salary_range VARCHAR(100),
        posted_by INT NOT NULL,
        status ENUM('open','closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (posted_by) REFERENCES users(id)
      ) ENGINE=InnoDB`,
    },
    {
      name: "applications",
      sql: `CREATE TABLE IF NOT EXISTS applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,
        student_id INT NOT NULL,
        resume_path VARCHAR(500) NOT NULL,
        parsed_data JSON,
        match_score FLOAT,
        status ENUM('pending','shortlisted','rejected','interview_scheduled') DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id),
        FOREIGN KEY (student_id) REFERENCES users(id)
      ) ENGINE=InnoDB`,
    },
    {
      name: "assessments",
      sql: `CREATE TABLE IF NOT EXISTS assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,
        round_number INT DEFAULT 1,
        questions JSON NOT NULL,
        duration_minutes INT DEFAULT 60,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      ) ENGINE=InnoDB`,
    },
    {
      name: "assessment_attempts",
      sql: `CREATE TABLE IF NOT EXISTS assessment_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        assessment_id INT NOT NULL,
        application_id INT NOT NULL,
        student_id INT NOT NULL,
        test_link VARCHAR(500) UNIQUE NOT NULL,
        answers JSON,
        score FLOAT,
        status ENUM('pending','in_progress','completed') DEFAULT 'pending',
        started_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id),
        FOREIGN KEY (application_id) REFERENCES applications(id),
        FOREIGN KEY (student_id) REFERENCES users(id)
      ) ENGINE=InnoDB`,
    },
  ];

  for (const t of tables) {
    try {
      await conn.query(t.sql);
      process.stdout.write("  [OK] " + t.name + "\n");
    } catch (e) {
      process.stdout.write("  [ERR] " + t.name + ": " + e.message + "\n");
    }
  }

  // Indexes (ignore duplicate errors)
  const indexes = [
    "CREATE INDEX idx_jobs_status ON jobs(status)",
    "CREATE INDEX idx_applications_job ON applications(job_id)",
    "CREATE INDEX idx_applications_student ON applications(student_id)",
    "CREATE INDEX idx_attempts_link ON assessment_attempts(test_link)",
  ];
  for (const idx of indexes) {
    try { await conn.query(idx); } catch (_) { /* already exists */ }
  }

  const [rows] = await conn.query("SHOW TABLES");
  process.stdout.write("\nTables in Talent_Gear:\n");
  rows.forEach((r) => process.stdout.write("  - " + Object.values(r)[0] + "\n"));

  await conn.end();
  process.stdout.write("\nSetup complete!\n");
}

run().catch((e) => {
  process.stderr.write("FATAL: " + e.message + "\n");
  process.exit(1);
});
