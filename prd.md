# Product Requirements Document (PRD)  
**Application Name:** Festify  
**Version:** 1.1  
**Date:** September 17, 2025  

---

## 1. Overview  
Festify is a web-based event coupon management platform that enables communities, organizations, and residential colonies to manage food coupon–based events. Any registered user can create events (becoming the admin of that event), generate QR code–enabled coupons, and track booking & redemption.  

---

## 2. Objectives  
- Allow multiple users to independently create and manage events.  
- Enable variable coupon rates (e.g., Member vs. Guest pricing).  
- Provide both **QR code PDF coupons** and **link-based coupons** for flexibility.  
- Ensure smooth redemption flow during events with accurate reporting.  

---

## 3. Key Features  

### 3.1 User & Role Management  
- Anyone can register/login.  
- A logged-in user can **create an event** → that user automatically becomes the **admin for that event only**.  
- Each event is owned by its creator; other users cannot edit/manage it.  

### 3.2 Event Management  
- Event creation fields:  
  - Event Name  
  - Description  
  - Start Date & End Date  
  - Venue  
  - Coupon Rates (e.g., Member: ₹X, Guest: ₹Y)  
  - Meal Choices (Regular, Jain, Vegan, etc.)  

### 3.3 Participant Management  
- Admin can add participants manually with details:  
  - Name  
  - Address / Flat Number (optional)  
  - Contact Number  
  - Coupon Booking: number of coupons split by **meal preference** and **rate type (Member/Guest)**  
- Future enhancement: Upload participant list via CSV.  

### 3.4 Coupon Management  
- Coupons generated per participant.  
- Each coupon includes:  
  - Event Name  
  - Participant Name  
  - Meal Type  
  - Rate Type (Member / Guest)  
  - Unique QR Code  
  - Coupon ID  
- Delivery options:  
  - **PDF format** (print or share)  
  - **Link format** (directly viewable online)  

### 3.5 Coupon Redemption (On Event Day)  
- Admin scans coupon QR code (via mobile or laptop camera).  
- System checks coupon status:  
  - If valid & unused → prompt admin: “How many coupons to redeem?”  
  - Mark selected number of coupons as **consumed**.  
- Prevents **double redemption** (already consumed = invalid).  

### 3.6 Event Summary & Reporting  
- Real-time and final event summary:  
  - Total Coupons Booked (split by **Member/Guest** + **Meal type**)  
  - Total Coupons Redeemed (same split)  
  - Pending Coupons (booked but not redeemed)  
- Export report as **PDF / Excel**.  

---

## 4. Functional Requirements  

| **ID** | **Requirement** | **Priority** |
|--------|-----------------|--------------|
| FR-1 | Any registered user can create an event and becomes its admin. | High |
| FR-2 | Event supports multiple coupon rates (e.g., Member vs. Guest). | High |
| FR-3 | Admin can add participant details with meal preference & coupon type. | High |
| FR-4 | System generates coupons as QR-enabled PDF or shareable link. | High |
| FR-5 | Each coupon has unique identifier linked to participant & event. | High |
| FR-6 | Admin can scan & redeem coupons with option to partially redeem. | High |
| FR-7 | Prevent duplicate coupon redemption. | High |
| FR-8 | Event summary shows booked vs. redeemed (by meal & rate type). | High |
| FR-9 | Reports exportable in PDF/Excel. | Medium |
| FR-10 | Participants upload via CSV. | Low |  

---

## 5. Non-Functional Requirements  

- **Scalability:** Handle 5000+ coupons per event.  
- **Security:**  
  - JWT authentication for users.  
  - Coupons (QR/link) must validate against backend (no reuse possible).  
- **Usability:** Responsive, mobile-first UI for scanning and management.  
- **Performance:** Redemption response time < 1 second.  

---

## 6. Tech Stack  

- **Frontend:** React (TypeScript recommended, Tailwind CSS for UI).  
- **Backend:** Node.js with Express.  
- **Database:** MySQL (with Sequelize or TypeORM ORM).  
- **QR Code Generation:** `qrcode` npm package.  
- **PDF Generation:** `pdfkit` or `puppeteer`.  
- **Authentication:** JWT (JSON Web Tokens).  
- **Hosting:** AWS / GCP / Oracle Cloud (to be finalized).  

---

## 7. Success Metrics  

- 100% unique coupon validation.  
- Smooth redemption under load (scanning ~2-3 coupons per second).  
- Event summary accuracy within ±0.5%.  
- Adoption: >80% admins prefer QR link/PDF over manual coupon distribution.  

---

## 8. Future Enhancements  
- Online payment integration (Stripe/Razorpay).  
- Multi-admin event collaboration.  
- Resident self-service booking portal.  
- WhatsApp/SMS notifications with coupon links.  
- Analytics dashboard across multiple events.  


## Database: festify
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
