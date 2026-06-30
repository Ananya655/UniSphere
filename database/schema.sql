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
  year            TINYINT UNSIGNED NOT NULL,
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
  INDEX idx_resources_year (year),
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
  CONSTRAINT chk_resources_year CHECK (year BETWEEN 1 AND 4),
  CONSTRAINT chk_resources_downloads_count CHECK (downloads_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- QUERIES (Academic Q&A)
-- Student-posted academic questions tied to a subject.
-- =============================================================================


CREATE TABLE queries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    resource_id BIGINT UNSIGNED NULL,

    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,

    posted_by BIGINT UNSIGNED NOT NULL,

    is_resolved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_queries_resource
        FOREIGN KEY (resource_id)
        REFERENCES resources(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_queries_user
        FOREIGN KEY (posted_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_resource(resource_id),
    INDEX idx_posted_by(posted_by),
    INDEX idx_created(created_at),
    INDEX idx_resolved(is_resolved)
);

-- =============================================================================
-- ANSWERS
-- Responses to academic queries.
-- =============================================================================
CREATE TABLE answers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    query_id BIGINT UNSIGNED NOT NULL,

    body TEXT NOT NULL,

    posted_by BIGINT UNSIGNED NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_answers_query
        FOREIGN KEY (query_id)
        REFERENCES queries(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_answers_user
        FOREIGN KEY (posted_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_query(query_id),
    INDEX idx_posted_by(posted_by)
);

-- =============================================================================
-- DISCUSSION POSTS
-- Community forum threads (exam prep, internships, placements, etc.).
-- =============================================================================
CREATE TABLE discussion_posts (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title      VARCHAR(250)    NOT NULL,
  body       TEXT            NOT NULL,
  category   ENUM('exam-prep', 'subject', 'internship', 'placement', 'other') NOT NULL,
  posted_by  BIGINT UNSIGNED NOT NULL,
  upvotes    INT UNSIGNED NOT NULL DEFAULT 0,
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

