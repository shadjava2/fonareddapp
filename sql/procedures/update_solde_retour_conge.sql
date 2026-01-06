-- Procédure stockée pour mettre à jour le solde de congé après un retour de congé
-- Cette procédure est appelée automatiquement après l'insertion d'un retour de congé
--
-- Paramètres:
--   p_retour_id: ID du retour de congé créé
--   p_fk_soldes: ID du solde de congé (congesolde.id)
--   p_nbrjour: Nombre de jours retournés (si null, ne met pas à jour)

DELIMITER $$

DROP PROCEDURE IF EXISTS update_solde_retour_conge$$

CREATE PROCEDURE update_solde_retour_conge(
    IN p_retour_id BIGINT,
    IN p_fk_soldes BIGINT,
    IN p_nbrjour INT
)
BEGIN
    DECLARE v_solde_actuel FLOAT;
    DECLARE v_nbrjour_val INT DEFAULT 0;

    -- Si p_nbrjour est NULL ou 0, ne rien faire
    IF p_nbrjour IS NULL OR p_nbrjour <= 0 THEN
        SET v_nbrjour_val = 0;
    ELSE
        SET v_nbrjour_val = p_nbrjour;
    END IF;

    -- Si v_nbrjour_val > 0, ajouter les jours au solde
    IF v_nbrjour_val > 0 THEN
        -- Récupérer le solde actuel
        SELECT solde INTO v_solde_actuel
        FROM congesolde
        WHERE id = p_fk_soldes;

        -- Si le solde existe, mettre à jour
        IF v_solde_actuel IS NOT NULL THEN
            UPDATE congesolde
            SET solde = solde + v_nbrjour_val,
                dateupdate = NOW()
            WHERE id = p_fk_soldes;
        END IF;
    END IF;

END$$

DELIMITER ;

-- Pour tester la procédure:
-- CALL update_solde_retour_conge(1, 1, 2);

