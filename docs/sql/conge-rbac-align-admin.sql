-- Idempotent: attribue TOUTES les permissions du catalogue au rôle Administrateur (ex. Mo).
-- Ne supprime aucune autre association. Adapter ROLE_ID si besoin (défaut 16 = full access app).
-- Appliquer: mysql NOM_BASE < docs/sql/conge-rbac-align-admin.sql

SET @role_id := (
  SELECT id FROM roles
  WHERE id = 16 OR LOWER(nom) LIKE '%admin%'
  ORDER BY CASE WHEN id = 16 THEN 0 ELSE 1 END
  LIMIT 1
);

INSERT IGNORE INTO roles_permissions (fkRole, fkPermission, datecreate, dateupdate)
SELECT @role_id, p.id, NOW(), NOW()
FROM permissions p
WHERE @role_id IS NOT NULL;
