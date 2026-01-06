import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import { apiPost } from '@/lib/fetcher';
import { EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  user: {
    id: number;
    nom: string | null;
    prenom: string | null;
    username: string;
    mail: string | null;
    phone: string | null;
    fkRole: number;
  };
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onSuccess,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // États pour le profil
  const [profileData, setProfileData] = useState({
    nom: user.nom || '',
    prenom: user.prenom || '',
    mail: user.mail || '',
    phone: user.phone || '',
  });

  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<{
    profile?: { [key: string]: string };
    password?: { [key: string]: string };
    general?: string;
  }>({});

  const validateProfile = () => {
    const newErrors: { [key: string]: string } = {};

    if (!profileData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!profileData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (
      profileData.mail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.mail)
    ) {
      newErrors.mail = "Format d'email invalide";
    }

    if (profileData.phone && !/^[0-9+\-\s()]+$/.test(profileData.phone)) {
      newErrors.phone = 'Format de téléphone invalide';
    }

    setErrors({ ...errors, profile: newErrors });
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = () => {
    const newErrors: { [key: string]: string } = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Le mot de passe actuel est requis';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword =
        'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors({ ...errors, password: newErrors });
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateProfile()) {
      onError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost('/api/auth/update-profile', {
        nom: profileData.nom.trim(),
        prenom: profileData.prenom.trim(),
        mail: profileData.mail.trim() || null,
        phone: profileData.phone.trim() || null,
      });

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        onError(response.message || 'Erreur lors de la mise à jour du profil');
      }
    } catch (error) {
      onError('Erreur lors de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      onError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.success) {
        onSuccess();
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        onClose();
      } else {
        onError(
          response.message || 'Erreur lors du changement de mot de passe'
        );
      }
    } catch (error) {
      onError('Erreur lors du changement de mot de passe. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Mon Profil">
      <div className="space-y-6">
        {/* Onglets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserIcon className="h-5 w-5 inline mr-2" />
              Informations personnelles
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg
                className="h-5 w-5 inline mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Changer le mot de passe
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nom"
                value={profileData.nom}
                onChange={(e) =>
                  setProfileData({ ...profileData, nom: e.target.value })
                }
                error={errors.profile?.nom}
                required
              />
              <Input
                label="Prénom"
                value={profileData.prenom}
                onChange={(e) =>
                  setProfileData({ ...profileData, prenom: e.target.value })
                }
                error={errors.profile?.prenom}
                required
              />
            </div>

            <Input
              label="Email"
              type="email"
              value={profileData.mail}
              onChange={(e) =>
                setProfileData({ ...profileData, mail: e.target.value })
              }
              error={errors.profile?.mail}
            />

            <Input
              label="Téléphone"
              value={profileData.phone}
              onChange={(e) =>
                setProfileData({ ...profileData, phone: e.target.value })
              }
              error={errors.profile?.phone}
            />

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Informations système
              </h4>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Nom d'utilisateur :</span>{' '}
                  {user.username}
                </div>
                <div>
                  <span className="font-medium">Rôle :</span> ID {user.fkRole}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={loading}>
                Sauvegarder
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Mot de passe actuel"
              type={showCurrentPassword ? 'text' : 'password'}
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              error={errors.password?.currentPassword}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="focus:outline-none"
                >
                  {showCurrentPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              }
              required
            />

            <Input
              label="Nouveau mot de passe"
              type={showNewPassword ? 'text' : 'password'}
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              error={errors.password?.newPassword}
              helperText="Minimum 8 caractères"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="focus:outline-none"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              }
              required
            />

            <Input
              label="Confirmer le nouveau mot de passe"
              type={showConfirmPassword ? 'text' : 'password'}
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              error={errors.password?.confirmPassword}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              }
              required
            />

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" loading={loading}>
                Changer le mot de passe
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
};

export default ProfileModal;
