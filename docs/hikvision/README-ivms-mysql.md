# iVMS-4200 → MySQL Fonaredd (Third-Party Database)

## Objectif

iVMS récupère les pointages des lecteurs (3 portes) et les **écrit directement** dans MySQL.
Fonaredd normalise ces lignes vers `acs_events` / `acs_users` et produit les rapports.

## 1. Créer la table + utilisateur MySQL

Sur le serveur MySQL (`fonaredd-app`) :

```sql
-- Table (aussi créée via `npx prisma db push`)
-- Colonnes = noms à coller dans le mapping iVMS

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

-- Compte dédié (INSERT seulement)
CREATE USER IF NOT EXISTS 'ivms_writer'@'%' IDENTIFIED BY 'CHANGEZ_CE_MOT_DE_PASSE';
GRANT INSERT, SELECT ON `fonaredd-app`.`ivms_attendance` TO 'ivms_writer'@'%';
FLUSH PRIVILEGES;
```

Si MySQL refuse les connexions distantes : `bind-address = 0.0.0.0` + firewall port 3306 (réseau Tailscale / LAN).

## 2. Configurer iVMS

**Time & Attendance → Attendance Settings → Third-Party Database**

| Champ | Valeur |
|---|---|
| Apply to Database | ON |
| Database Type | MySQL |
| Server IP | IP du serveur MySQL (ex. `100.117.99.83` ou IP LAN) |
| Port | `3306` |
| Database Name | `fonaredd-app` |
| User / Password | `ivms_writer` / … |
| Table Name | `ivms_attendance` |

### Mapping des champs

| Champ iVMS | Colonne MySQL |
|---|---|
| ID | `ivms_id` |
| Authentication Date and Time | `auth_datetime` (`yyyy-MM-dd HH:mm:ss` ou `yyyy-MM-ddTHH:mm:ss`) |
| Authentication Date | `auth_date` |
| Authentication Time | `auth_time` |
| Direction (Enter / Exit) | `direction` |
| Device Name | `device_name` |
| Device Serial No. | `device_serial` |
| Person Name | `person_name` |
| Card No. (si présent) | `card_no` |

Puis **Save**.

## 3. Dans Fonaredd

1. Page **Personnel → Hikvision Ingest**
2. Bouton **Normaliser iVMS → acs_events** (transfère les nouvelles lignes)
3. Optionnel : **Importer CSV Original Records** pour l’historique avant le push
4. Optionnel : **Synchroniser photos** (`docs/hikvision/enrlFace` + `export_pic`)

Les rapports se tirent uniquement dans Fonaredd (jamais depuis iVMS pour le reporting RH).
