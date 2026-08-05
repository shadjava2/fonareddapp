-- Règles présence : Entrée et Sortie séparées

CREATE TABLE IF NOT EXISTS presence_rules (
  id INT NOT NULL PRIMARY KEY DEFAULT 1,
  start_work_time VARCHAR(8) NOT NULL DEFAULT '08:30',
  end_work_time VARCHAR(8) NOT NULL DEFAULT '18:00',
  checkin_valid_from VARCHAR(8) NOT NULL DEFAULT '08:00',
  checkin_valid_to VARCHAR(8) NOT NULL DEFAULT '09:30',
  late_from VARCHAR(8) NOT NULL DEFAULT '08:40',
  late_until VARCHAR(8) NOT NULL DEFAULT '09:10',
  checkout_valid_from VARCHAR(8) NOT NULL DEFAULT '17:30',
  checkout_valid_to VARCHAR(8) NOT NULL DEFAULT '18:30',
  late_allowable_minutes INT NOT NULL DEFAULT 10,
  early_leave_allowable_minutes INT NOT NULL DEFAULT 10,
  absent_after_hours INT NOT NULL DEFAULT 3,
  count_mission_as_presence TINYINT(1) NOT NULL DEFAULT 1,
  score_on_time INT NOT NULL DEFAULT 100,
  score_late INT NOT NULL DEFAULT 70,
  score_early_leave INT NOT NULL DEFAULT 80,
  score_late_exit INT NOT NULL DEFAULT 90,
  score_absent INT NOT NULL DEFAULT 0,
  score_mission_day INT NOT NULL DEFAULT 95,
  excellent_min INT NOT NULL DEFAULT 90,
  bon_min INT NOT NULL DEFAULT 75,
  moyen_min INT NOT NULL DEFAULT 50,
  updated_at DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migration tables déjà créées
-- ALTER TABLE presence_rules ADD COLUMN late_from VARCHAR(8) NOT NULL DEFAULT '08:40';
-- ALTER TABLE presence_rules ADD COLUMN late_until VARCHAR(8) NOT NULL DEFAULT '09:10';

INSERT INTO presence_rules (
  id,
  start_work_time,
  end_work_time,
  checkin_valid_from,
  checkin_valid_to,
  late_from,
  late_until,
  checkout_valid_from,
  checkout_valid_to,
  late_allowable_minutes,
  early_leave_allowable_minutes,
  absent_after_hours,
  count_mission_as_presence,
  score_on_time,
  score_late,
  score_early_leave,
  score_late_exit,
  score_absent,
  score_mission_day,
  excellent_min,
  bon_min,
  moyen_min,
  updated_at
) VALUES (
  1,
  '08:30',
  '18:00',
  '08:00',
  '09:30',
  '08:40',
  '09:10',
  '17:30',
  '18:30',
  10,
  10,
  3,
  1,
  100,
  70,
  80,
  90,
  0,
  95,
  90,
  75,
  50,
  NOW()
)
ON DUPLICATE KEY UPDATE
  late_from = COALESCE(late_from, '08:40'),
  late_until = COALESCE(late_until, '09:10');
