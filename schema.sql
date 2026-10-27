-- ============================================================================
-- CS543: Web Services - Campus Library Relational Schema
-- Author: Ritik Kumar (Roll No: 20251651078)
-- Institution: IIIT Vadodara
-- ============================================================================

-- 1. Create and switch to the database
CREATE DATABASE IF NOT EXISTS gqldemo;
USE gqldemo;

-- 2. Clean existing tables if resetting
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;

-- 3. Create authors table (1 --- M relationship with books)
CREATE TABLE authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(50) DEFAULT 'India',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create books table with Foreign Key constraint
CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  year INT,
  author_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
);

-- 5. Insert sample seed data
INSERT INTO authors (name, country) VALUES
  ('Asha Patel', 'India'),
  ('Ravi Kumar', 'India'),
  ('Ritik Kumar', 'India');

INSERT INTO books (title, year, author_id) VALUES
  ('Databases 101', 2020, 1),
  ('SQL in Practice', 2022, 1),
  ('Web Services Basics', 2023, 2),
  ('GraphQL & Distributed Architecture', 2025, 3),
  ('Cloud Microservices Handbook', 2026, 3);
