-- Database Schema Updates for User Management Features
-- Run these commands to update your existing database

USE festify;

-- ========================
-- 1. Add role field to users table
-- ========================
ALTER TABLE users ADD COLUMN role ENUM('manager', 'representative') NOT NULL DEFAULT 'manager';
ALTER TABLE users ADD COLUMN created_by INT NULL REFERENCES users(user_id);

-- ========================
-- 2. Create Event Representatives Table
-- ========================
CREATE TABLE IF NOT EXISTS event_representatives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    assigned_by INT NOT NULL,
    permissions JSON NOT NULL DEFAULT ('["add_participants", "redeem_coupons"]'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_user (event_id, user_id)
);

-- ========================
-- 3. Update redemptions table to handle user authentication
-- ========================
-- The redeemed_by field already exists and should work with the new user management system

-- ========================
-- 4. Insert sample data for testing (optional)
-- ========================

-- Sample manager user (password: admin123)
INSERT IGNORE INTO users (name, email, password_hash, role) VALUES
('Admin Manager', 'admin@festify.com', '$2a$12$LQv3c1yqBw1mA4H6GEwxGOjHr5P.Zsx0KrB.TYKlcIwFzHhKtUd4a', 'manager');

-- Note: You'll need to run this SQL against your MySQL database
-- You can use MySQL Workbench, phpMyAdmin, or command line:
-- mysql -u your_username -p festify < schema_update.sql