-- iVMS Third-Party Database → MySQL (fonaredd-app)
-- À exécuter si `prisma db push` n’est pas utilisé.

ALTER TABLE acs_events
  ADD COLUMN IF NOT EXISTS person_name VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS checkpoint VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS device_serial VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS custom_status VARCHAR(128) NULL,
  ADD COLUMN IF NOT EXISTS data_source VARCHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS source VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS photo_path VARCHAR(500) NULL;

ALTER TABLE acs_users
  ADD COLUMN IF NOT EXISTS face_path VARCHAR(500) NULL;

CREATE TABLE IF NOT EXISTS ivms_attendance (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ivms_id BIGINT NULL,
  auth_datetime DATETIME NOT NULL,
  auth_date DATE NULL,
  auth_time VARCHAR(16) NULL,
  direction VARCHAR(32) NULL,
  device_name VARCHAR(128) NULL,
  device_serial VARCHAR(64) NULL,
  person_name VARCHAR(128) NULL,
  card_no VARCHAR(64) NULL,
  employee_no VARCHAR(64) NULL,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  normalized_at DATETIME NULL,
  UNIQUE KEY uniq_ivms_id (ivms_id),
  KEY idx_ivms_auth_datetime (auth_datetime),
  KEY idx_ivms_normalized (normalized_at),
  KEY idx_ivms_person (person_name),
  KEY idx_ivms_card (card_no)
);

-- MySQL 8.0.12+ : ADD COLUMN IF NOT EXISTS ok.
-- Sinon, exécuter les ADD COLUMN un par un en ignorant les erreurs « duplicate column ».

CREATE USER IF NOT EXISTS 'ivms_writer'@'%' IDENTIFIED BY 'CHANGEZ_CE_MOT_DE_PASSE';
GRANT INSERT, SELECT ON `fonaredd-app`.`ivms_attendance` TO 'ivms_writer'@'%';
FLUSH PRIVILEGES;
