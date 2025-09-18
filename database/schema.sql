-- Festify Database Schema
CREATE DATABASE IF NOT EXISTS festify;
USE festify;

-- ========================
-- 1. Users Table
-- ========================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================
-- 2. Events Table
-- ========================
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    venue VARCHAR(255),
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ========================
-- 3. Coupon Rates Table
-- ========================
CREATE TABLE coupon_rates (
    rate_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    rate_type ENUM('Member', 'Guest') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- ========================
-- 4. Meal Choices Table
-- ========================
CREATE TABLE meal_choices (
    meal_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- ========================
-- 5. Participants Table
-- ========================
CREATE TABLE participants (
    participant_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    contact_number VARCHAR(20),
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

-- ========================
-- 6. Coupons Table
-- ========================
CREATE TABLE coupons (
    coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    participant_id INT NOT NULL,
    event_id INT NOT NULL,
    rate_id INT NOT NULL,
    meal_id INT NOT NULL,
    qr_code_value VARCHAR(255) UNIQUE NOT NULL,
    qr_code_link VARCHAR(255),
    status ENUM('Booked', 'Consumed', 'Partial') DEFAULT 'Booked',
    consumed_count INT DEFAULT 0,
    total_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(participant_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    FOREIGN KEY (rate_id) REFERENCES coupon_rates(rate_id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meal_choices(meal_id) ON DELETE CASCADE
);

-- ========================
-- 7. Redemptions Table
-- ========================
CREATE TABLE redemptions (
    redemption_id INT AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT NOT NULL,
    redeemed_count INT NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    redeemed_by INT,
    FOREIGN KEY (coupon_id) REFERENCES coupons(coupon_id) ON DELETE CASCADE,
    FOREIGN KEY (redeemed_by) REFERENCES users(user_id) ON DELETE SET NULL
);