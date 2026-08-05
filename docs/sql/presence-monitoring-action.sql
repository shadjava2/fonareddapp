-- Table des actions de monitoring de présence (notes circulaires)
CREATE TABLE IF NOT EXISTS presence_monitoring_action (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_no VARCHAR(64) NOT NULL,
  year INT NOT NULL,
  month TINYINT NOT NULL,
  rule_code VARCHAR(32) NOT NULL,
  action VARCHAR(40) NOT NULL DEFAULT 'pending',
  metric_value FLOAT NULL,
  detail TEXT NULL,
  notes VARCHAR(500) NULL,
  datecreate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dateupdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usercreateid BIGINT UNSIGNED NULL,
  userupdateid BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_presence_mon_case (employee_no, year, month, rule_code),
  KEY idx_presence_mon_period (year, month),
  KEY idx_presence_mon_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
