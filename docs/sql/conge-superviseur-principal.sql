-- Additive only — superviseur principal + observations optionnelles
-- Appliquer: mysql NOM_BASE < docs/sql/conge-superviseur-principal.sql

ALTER TABLE congeconfig
  ADD COLUMN fkSuperviseurPrincipal BIGINT UNSIGNED NULL
  COMMENT 'Agent système superviseur principal (copie / visa optionnel)';

CREATE TABLE IF NOT EXISTS conge_observation_principal (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fkDemande BIGINT NOT NULL,
  fkUtilisateur BIGINT UNSIGNED NOT NULL,
  observations TEXT NULL,
  datecreate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dateupdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  usercreateid BIGINT UNSIGNED NULL,
  userupdateid BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_obs_demande (fkDemande),
  KEY idx_obs_user (fkUtilisateur)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
