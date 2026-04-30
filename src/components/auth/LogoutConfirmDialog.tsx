import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modale de confirmation de déconnexion (remplace window.confirm / alert).
 */
const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { logout } = useAuth();
  const router = useRouter();
  const { showError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(() => {
    void (async () => {
      setLoading(true);
      try {
        await logout();
        onClose();
        await router.push('/');
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        showError(
          'Déconnexion',
          'La session n’a pas pu être fermée correctement. Vous allez être renvoyé à l’accueil.'
        );
        onClose();
        await router.push('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [logout, onClose, router, showError]);

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Quitter la session ?"
      message={
        'Vous allez être déconnecté de l’application.\n' +
        'Les formulaires non enregistrés seront perdus.'
      }
      type="info"
      confirmText="Se déconnecter"
      cancelText="Rester connecté"
      loading={loading}
    />
  );
};

export default LogoutConfirmDialog;
