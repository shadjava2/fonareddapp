-- Script d'initialisation de la base de données Fonaredd
-- Ce script sera exécuté automatiquement au premier démarrage du conteneur MySQL

USE fonaredd_db;

-- Créer les permissions de base
INSERT IGNORE INTO permissions (code, nom, description) VALUES
('USER_MANAGE', 'Gestion des utilisateurs', 'Permet de gérer les utilisateurs du système'),
('ROLE_MANAGE', 'Gestion des rôles', 'Permet de gérer les rôles et permissions'),
('SERVICE_MANAGE', 'Gestion des services', 'Permet de gérer les services disponibles'),
('SITE_MANAGE', 'Gestion des sites', 'Permet de gérer les sites/lieux de travail'),
('CONGE_MANAGE', 'Gestion des congés', 'Permet de gérer les congés et approbations'),
('CONGE_REQUEST', 'Demande de congés', 'Permet de demander des congés'),
('CALENDAR_MANAGE', 'Gestion du calendrier', 'Permet de gérer le calendrier des jours ouvrés'),
('PRESENCE_MANAGE', 'Gestion des présences', 'Permet de gérer les présences'),
('PRESENCE_VIEW', 'Consultation des présences', 'Permet de consulter les présences');

-- Créer les rôles de base
INSERT IGNORE INTO roles (nom, description) VALUES
('Administrateur', 'Rôle administrateur avec tous les droits'),
('Gestionnaire', 'Rôle gestionnaire avec droits de gestion'),
('Utilisateur', 'Rôle utilisateur standard');

-- Créer les services de base
INSERT IGNORE INTO services (nom, description, actif) VALUES
('Administration', 'Service d\'administration générale', 1),
('Ressources Humaines', 'Service des ressources humaines', 1),
('Gestion des Congés', 'Service de gestion des congés', 1),
('Gestion des Présences', 'Service de gestion des présences', 1);

-- Créer les sites de base
INSERT IGNORE INTO sites (nom, adresse, actif) VALUES
('Siège Social', 'Adresse du siège social', 1),
('Agence Principale', 'Adresse de l\'agence principale', 1);

-- Attribuer toutes les permissions au rôle Administrateur
INSERT IGNORE INTO roles_permissions (fkRole, fkPermission)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.nom = 'Administrateur';

-- Créer un utilisateur administrateur par défaut
-- Mot de passe: admin123 (à changer en production)
INSERT IGNORE INTO utilisateurs (nom, prenom, username, mot_de_passe, fkRole, locked, initPassword) VALUES
('Admin', 'Système', 'admin', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4XgQ7qP8/2', 1, 0, 1);

-- Créer la configuration de congé par défaut
INSERT IGNORE INTO congeconfig (nbjourMois) VALUES (2.5);

-- Créer quelques entrées de calendrier pour l'année en cours
INSERT IGNORE INTO calendrier (d, label, is_holiday, is_chome, is_business_day) VALUES
-- Jours fériés 2024
('2024-01-01', 'Jour de l\'An', 1, 0, 0),
('2024-04-01', 'Lundi de Pâques', 1, 0, 0),
('2024-05-01', 'Fête du Travail', 1, 0, 0),
('2024-05-08', 'Victoire 1945', 1, 0, 0),
('2024-05-09', 'Ascension', 1, 0, 0),
('2024-05-20', 'Lundi de Pentecôte', 1, 0, 0),
('2024-07-14', 'Fête Nationale', 1, 0, 0),
('2024-08-15', 'Assomption', 1, 0, 0),
('2024-11-01', 'Toussaint', 1, 0, 0),
('2024-11-11', 'Armistice', 1, 0, 0),
('2024-12-25', 'Noël', 1, 0, 0);

-- Créer quelques jours ouvrés pour la semaine type
-- (Les weekends sont automatiquement non ouvrés sauf configuration spéciale)
-- Les jours de semaine sont automatiquement ouvrés

-- Créer un solde de congé pour l'administrateur
INSERT IGNORE INTO congesolde (fkUser, solde, consommé, annee) VALUES
(1, 30.0, 0.0, 2024);

COMMIT;
