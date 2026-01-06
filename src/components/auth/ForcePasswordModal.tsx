import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import { apiPost } from '@/lib/fetcher';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import React, { useState } from 'react';

interface ForcePasswordModalProps {
  isOpen: boolean;
  username: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const ForcePasswordModal: React.FC<ForcePasswordModalProps> = ({
  isOpen,
  username,
  onSuccess,
  onError,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      newErrors.password =
        'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await apiPost<{
        success: boolean;
        message?: string;
      }>('/api/auth/reset-init', {
        username,
        password,
      });

      if (response.success) {
        onSuccess();
        // Reset form
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrors({
          general:
            response.message || 'Erreur lors de la mise à jour du mot de passe',
        });
      }
    } catch (error) {
      setErrors({
        general:
          'Erreur lors de la mise à jour du mot de passe. Veuillez réessayer.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {}} // Empêcher la fermeture
      title="Configuration du mot de passe"
      showCloseButton={false}
    >
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Mot de passe initial requis
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Vous devez définir un mot de passe pour accéder aux modules de
                  l'application. Cette étape est obligatoire pour des raisons de
                  sécurité.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errors.general}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Nouveau mot de passe"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            helperText="Minimum 8 caractères"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                )}
              </button>
            }
          />

          <Input
            label="Confirmer le mot de passe"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
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
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
            >
              Configurer le mot de passe
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default ForcePasswordModal;
