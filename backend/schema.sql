-- Keep existing users table
-- CREATE TABLE users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   email VARCHAR(255) UNIQUE NOT NULL,
--   password VARCHAR(255) NOT NULL,
--   role ENUM('admin', 'employee') DEFAULT 'employee'
-- );

-- Jobs posted by admin
CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  location VARCHAR(255),
  salary_range VARCHAR(100),
  experience_level ENUM('fresher', 'junior', 'mid', 'senior') DEFAULT 'fresher',
  posted_by INT NOT NULL,
  status ENUM('open', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES users(id)
);

-- Student applications
CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  student_id INT NOT NULL,
  resume_path VARCHAR(500) NOT NULL,
  parsed_data JSON,
  match_score FLOAT,
  status ENUM('pending', 'shortlisted', 'rejected', 'interview_scheduled') DEFAULT 'pending',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

-- Assessment rounds (Round 1: Aptitude + DSA)
CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  round_number INT DEFAULT 1,
  questions JSON NOT NULL,
  duration_minutes INT DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

-- Student assessment attempts
CREATE TABLE assessment_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  application_id INT NOT NULL,
  student_id INT NOT NULL,
  test_link VARCHAR(500) UNIQUE NOT NULL,
  answers JSON,
  score FLOAT,
  status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id),
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_attempts_link ON assessment_attempts(test_link);
