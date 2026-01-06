import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import Select from '@/components/ui/Select';
import Table from '@/components/ui/Table';
import { useCrud } from '@/hooks/useCrud';
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date';
  required?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  validation?: (value: any) => string | null;
}

interface CrudFormProps {
  endpoint: string;
  title: string;
  fields: FieldConfig[];
  columns: Array<{
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }>;
  onSave?: (data: any) => Promise<boolean>;
  onDelete?: (id: string | number) => Promise<boolean>;
}

const CrudForm: React.FC<CrudFormProps> = ({
  endpoint,
  title,
  fields,
  columns,
  onSave,
  onDelete,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    data,
    loading,
    error,
    pagination,
    search,
    editingItem,
    create,
    update,
    remove,
    handlePageChange,
    handleSizeChange,
    handleSearch,
    startEdit,
    cancelEdit,
  } = useCrud(endpoint);

  // Initialiser le formulaire
  useEffect(() => {
    if (editingItem) {
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        initialData[field.key] = (editingItem as any)[field.key] || '';
      });
      setFormData(initialData);
      setShowForm(true);
    } else {
      const initialData: Record<string, any> = {};
      fields.forEach(field => {
        initialData[field.key] = '';
      });
      setFormData(initialData);
    }
  }, [editingItem, fields]);

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    // Effacer l'erreur pour ce champ
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const value = formData[field.key];

      if (field.required && (!value || value === '')) {
        newErrors[field.key] = `${field.label} est requis`;
      } else if (field.validation) {
        const validationError = field.validation(value);
        if (validationError) {
          newErrors[field.key] = validationError;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const success = editingItem
      ? await update(editingItem.id, formData)
      : await create(formData);

    if (success) {
      setShowForm(false);
      cancelEdit();
    }
  };

  const handleDelete = async () => {
    if (deleteItem) {
      const success = await remove(deleteItem.id);
      if (success) {
        setShowDeleteDialog(false);
        setDeleteItem(null);
      }
    }
  };

  const openDeleteDialog = (item: any) => {
    setDeleteItem(item);
    setShowDeleteDialog(true);
  };

  const renderField = (field: FieldConfig) => {
    const commonProps = {
      label: field.label,
      value: formData[field.key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(field.key, e.target.value),
      error: errors[field.key],
      placeholder: field.placeholder,
    };

    switch (field.type) {
      case 'select':
        return (
          <Select
            key={field.key}
            label={field.label}
            value={formData[field.key] || ''}
            onChange={(value) => handleInputChange(field.key, value)}
            options={field.options || []}
            error={errors[field.key]}
            placeholder={field.placeholder}
          />
        );
      case 'textarea':
        return (
          <div key={field.key} className="space-y-1">
            <label className="label">{field.label}</label>
            <textarea
              className="input min-h-[100px] resize-y"
              value={formData[field.key] || ''}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
            />
            {errors[field.key] && (
              <p className="text-sm text-red-600">{errors[field.key]}</p>
            )}
          </div>
        );
      default:
        return (
          <Input
            key={field.key}
            type={field.type}
            {...commonProps}
          />
        );
    }
  };

  const tableColumns = [
    ...columns,
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, item: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startEdit(item)}
            className="text-blue-600 hover:text-blue-800"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteDialog(item)}
            className="text-red-600 hover:text-red-800"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">Gestion des {title.toLowerCase()}</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Ajouter</span>
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-lg shadow">
        <Table
          data={data}
          columns={tableColumns}
          loading={loading}
          emptyMessage={`Aucun ${title.toLowerCase()} trouvé`}
        />

        {pagination.totalPages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.size}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleSizeChange}
          />
        )}
      </div>

      {/* Modal de formulaire */}
      <Dialog
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          cancelEdit();
        }}
        title={editingItem ? `Modifier ${title.toLowerCase()}` : `Ajouter ${title.toLowerCase()}`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map(field => renderField(field))}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                cancelEdit();
              }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
            >
              {editingItem ? 'Modifier' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal de suppression */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={loading}
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CrudForm;
