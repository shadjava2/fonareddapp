-- Additive only — pièces jointes demandes de congé
-- Appliquer: mysql NOM_BASE < docs/sql/conge-demande-fichiers.sql

CREATE TABLE IF NOT EXISTS congedemande_fichier (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  fkDemande BIGINT NOT NULL,
  nom_original VARCHAR(255) NOT NULL,
  chemin VARCHAR(500) NOT NULL,
  mime VARCHAR(120) NULL,
  taille INT UNSIGNED NULL,
  datecreate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usercreateid BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  KEY idx_cdf_demande (fkDemande)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
