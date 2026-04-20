CREATE DATABASE IF NOT EXISTS `emsi_copilot`;
USE `emsi_copilot`;

-- Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE
);

-- Semesters Table
CREATE TABLE IF NOT EXISTS `semesters` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `number` INT NOT NULL UNIQUE,
    `year` INT NOT NULL DEFAULT 1
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `semester_id` INT,
    FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`)
);

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role_id` INT,
    `is_active` INT DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user_email` (`email`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
);

-- Courses Table
CREATE TABLE IF NOT EXISTS `courses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `semester_id` INT,
    `subject_id` INT,
    `professor_id` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_course_semester` (`semester_id`),
    FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`),
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`),
    FOREIGN KEY (`professor_id`) REFERENCES `users`(`id`)
);

-- Documents Table
CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_id` INT,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `raw_text` LONGTEXT,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`)
);

-- Chat History Table
CREATE TABLE IF NOT EXISTS `chat_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT,
    `query` TEXT NOT NULL,
    `response` TEXT NOT NULL,
    `semester_id` INT,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`)
);

-- Initial Data
INSERT IGNORE INTO `roles` (`name`) VALUES ('Admin'), ('Professor'), ('Student');
INSERT IGNORE INTO `semesters` (`number`, `year`) VALUES 
(1, 1), (2, 1), 
(3, 2), (4, 2), 
(5, 3), (6, 3), 
(7, 4), (8, 4), 
(9, 5), (10, 5);
