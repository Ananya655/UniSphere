-- Migration: Add year column to resources table
-- Run once on existing databases: mysql ... < database/migrations/001_add_year_to_resources.sql

USE unisphere;

ALTER TABLE resources
  ADD COLUMN year TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER semester;

ALTER TABLE resources
  ADD CONSTRAINT chk_resources_year CHECK (year BETWEEN 1 AND 4);

CREATE INDEX idx_resources_year ON resources (year);
