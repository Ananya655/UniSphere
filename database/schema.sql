-- =============================================================================
-- UniSphere Database Schema
-- Academic Resource Sharing & Student Community Platform
-- MySQL 8.0+ | InnoDB | UTF-8 (utf8mb4)
-- =============================================================================

-- Drop and recreate for clean local development (comment out in production)
-- DROP DATABASE IF EXISTS unisphere;

CREATE DATABASE IF NOT EXISTS unisphere
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE unisphere;

-- =============================================================================
-- USERS
-- Stores student accounts and profile information.
-- Password column holds bcrypt hash (never store plain text).
-- =============================================================================
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100)    NOT NULL,
  email           VARCHAR(255)    NOT NULL,
  password        VARCHAR(255)    NOT NULL COMMENT 'bcrypt hash',
  college         VARCHAR(150)    NOT NULL,
  branch          VARCHAR(100)    NOT NULL,
  current_year    ENUM('1', '2', '3', '4') NOT NULL,
  bio             TEXT            NULL,
  profile_picture VARCHAR(500)    NULL COMMENT 'Cloudinary or CDN URL',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_branch (branch),
  INDEX idx_users_college (college),

  CONSTRAINT chk_users_name_length CHECK (CHAR_LENGTH(name) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SUBJECTS
-- Canonical list of subjects scoped by branch and semester.
-- Prevents duplicate subject names within the same branch/semester.
-- =============================================================================
CREATE TABLE subjects (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150)    NOT NULL,
  branch     VARCHAR(100)    NOT NULL,
  semester   TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_subjects_name_branch_semester (name, branch, semester),
  INDEX idx_subjects_branch (branch),
  INDEX idx_subjects_semester (semester),
  INDEX idx_subjects_branch_semester (branch, semester),

  CONSTRAINT chk_subjects_semester CHECK (semester BETWEEN 1 AND 8)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- RESOURCES
-- Uploaded academic files (notes, PYQs, reference material).
-- =============================================================================
CREATE TABLE resources (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT            NULL,
  college         VARCHAR(150)    NOT NULL,
  subject_id      BIGINT UNSIGNED NOT NULL,
  branch          VARCHAR(100)    NOT NULL,
  semester        TINYINT UNSIGNED NOT NULL,
  type            ENUM('notes', 'pyq', 'reference', 'lab', 'assignment') NOT NULL,
  file_url        VARCHAR(500)    NOT NULL COMMENT 'Cloudinary or storage URL',
  uploaded_by     BIGINT UNSIGNED NULL,
  downloads_count INT UNSIGNED    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_resources_subject_id (subject_id),
  INDEX idx_resources_branch (branch),
  INDEX idx_resources_semester (semester),
  INDEX idx_resources_type (type),
  INDEX idx_resources_uploaded_by (uploaded_by),
  INDEX idx_resources_branch_semester (branch, semester),
  INDEX idx_resources_created_at (created_at),

  CONSTRAINT fk_resources_subject
    FOREIGN KEY (subject_id) REFERENCES subjects (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_resources_uploaded_by
    FOREIGN KEY (uploaded_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT chk_resources_semester CHECK (semester BETWEEN 1 AND 8),
  CONSTRAINT chk_resources_downloads_count CHECK (downloads_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- QUERIES (Academic Q&A)
-- Student-posted academic questions tied to a subject.
-- =============================================================================
CREATE TABLE queries (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(250)    NOT NULL,
  body        TEXT            NOT NULL,
  subject_id  BIGINT UNSIGNED NOT NULL,
  branch      VARCHAR(100)    NOT NULL,
  posted_by   BIGINT UNSIGNED NOT NULL,
  is_resolved TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_queries_subject_id (subject_id),
  INDEX idx_queries_branch (branch),
  INDEX idx_queries_posted_by (posted_by),
  INDEX idx_queries_is_resolved (is_resolved),
  INDEX idx_queries_created_at (created_at),

  CONSTRAINT fk_queries_subject
    FOREIGN KEY (subject_id) REFERENCES subjects (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT fk_queries_posted_by
    FOREIGN KEY (posted_by) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT chk_queries_is_resolved CHECK (is_resolved IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ANSWERS
-- Responses to academic queries.
-- =============================================================================
CREATE TABLE answers (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  query_id   BIGINT UNSIGNED NOT NULL,
  body       TEXT            NOT NULL,
  posted_by  BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_answers_query_id (query_id),
  INDEX idx_answers_posted_by (posted_by),
  INDEX idx_answers_created_at (created_at),

  CONSTRAINT fk_answers_query
    FOREIGN KEY (query_id) REFERENCES queries (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_answers_posted_by
    FOREIGN KEY (posted_by) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DISCUSSION POSTS
-- Community forum threads (exam prep, internships, placements, etc.).
-- =============================================================================
CREATE TABLE discussion_posts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(250)    NOT NULL,
  body       TEXT            NOT NULL,
  category   ENUM('General','Placements','Internships','Exams','Projects','Career', 'Other')    NOT NULL,
  posted_by  BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_discussion_posts_category (category),
  INDEX idx_discussion_posts_posted_by (posted_by),
  INDEX idx_discussion_posts_created_at (created_at),

  CONSTRAINT fk_discussion_posts_posted_by
    FOREIGN KEY (posted_by) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DISCUSSION COMMENTS
-- Comments on forum posts.
-- =============================================================================
CREATE TABLE discussion_comments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    BIGINT UNSIGNED NOT NULL,
  body       TEXT            NOT NULL,
  posted_by  BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_discussion_comments_post_id (post_id),
  INDEX idx_discussion_comments_posted_by (posted_by),
  INDEX idx_discussion_comments_created_at (created_at),

  CONSTRAINT fk_discussion_comments_post
    FOREIGN KEY (post_id) REFERENCES discussion_posts (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_discussion_comments_posted_by
    FOREIGN KEY (posted_by) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- POST UPVOTES
-- Tracks which users upvoted which discussion posts (one vote per user per post).
-- =============================================================================
CREATE TABLE post_upvotes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_post_upvotes_post_user (post_id, user_id),
  INDEX idx_post_upvotes_user_id (user_id),
  INDEX idx_post_upvotes_post_id (post_id),

  CONSTRAINT fk_post_upvotes_post
    FOREIGN KEY (post_id) REFERENCES discussion_posts (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_post_upvotes_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




-- =============================================================================
-- SAMPLE DATA (for local testing)
-- Password values below are placeholder bcrypt hashes (not real credentials).
-- Replace with properly hashed passwords in production.
-- =============================================================================

INSERT INTO users (name, email, password, college, branch, current_year, bio) VALUES
('Ananya Reddy', 'ananya.reddy@vit.ac.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'VIT Vellore', 'Computer Science', '3', 'Final-year CS student interested in systems and backend development.'),
('Rahul Sharma', 'rahul.sharma@iitb.ac.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'IIT Bombay', 'Computer Science', '2', 'Sophomore exploring algorithms and competitive programming.'),
('Priya Nair', 'priya.nair@bits-pilani.ac.in', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'BITS Pilani', 'Electronics', '4', 'Placement season — happy to share internship and interview prep notes.');

INSERT INTO subjects (name, branch, semester) VALUES
('Database Management Systems', 'Computer Science', 5),
('Operating Systems', 'Computer Science', 4),
('Digital Signal Processing', 'Electronics', 6);

INSERT INTO resources (title, description, college, subject_id, branch, semester, type, file_url, uploaded_by, downloads_count) VALUES
('DBMS Unit 1-3 Notes', 'Comprehensive handwritten and typed notes covering normalization, ER diagrams, and SQL basics.', 'VIT Vellore',1, 'Computer Science', 5, 'notes', 'https://res.cloudinary.com/unisphere/raw/upload/v1/resources/dbms-notes.pdf', 1, 42),
('DBMS End-Sem PYQ 2023', 'Previous year question paper with marking scheme for DBMS end-semester exam.','IIT Bombay', 1, 'Computer Science', 5, 'pyq', 'https://res.cloudinary.com/unisphere/raw/upload/v1/resources/dbms-pyq-2023.pdf', 2, 87),
('Silberschatz OS Reference Summary', 'Chapter-wise summary of key concepts from the standard OS textbook.', 'VIT Vellore',2, 'Computer Science', 4, 'reference', 'https://res.cloudinary.com/unisphere/raw/upload/v1/resources/os-reference.pdf', 1, 31);

INSERT INTO queries (title, body, subject_id, branch, posted_by, is_resolved) VALUES
('Difference between 2NF and 3NF?', 'I understand functional dependencies but I keep confusing second and third normal form. Can someone explain with a simple example?', 1, 'Computer Science', 2, 1);

INSERT INTO answers (query_id, body, posted_by) VALUES
(1, '2NF removes partial dependencies on a composite key. 3NF goes further and removes transitive dependencies where a non-key column depends on another non-key column. Example: in a table with (student_id, course_id, instructor_name), if instructor_name depends only on course_id, that violates 3NF.', 1);

INSERT INTO discussion_posts (title, body, category, posted_by) VALUES
('How to prepare for DBMS end-sem in 2 weeks?', 'Exams are close and I have not finished normalization and transactions. What topics should I prioritize?', 'Exams', 2);

INSERT INTO discussion_comments (post_id, body, posted_by) VALUES
(1, 'Focus on ER to relational mapping, normalization up to BCNF, and SQL joins/subqueries first. PYQs helped me the most last semester.', 3);

INSERT INTO post_upvotes (post_id, user_id) VALUES
(1, 1),
(1, 3);
