-- Add coupon_bookings column to participation_requests table
-- This column stores JSON data for coupon booking details

ALTER TABLE `participation_requests`
ADD COLUMN `coupon_bookings` TEXT DEFAULT NULL
AFTER `message`;

-- Update the existing table file for future reference
-- The coupon_bookings column stores JSON string with booking details like:
-- [{"rate_id": 1, "meal_id": 2, "quantity": 3}]