import React, { useState } from 'react';

interface FieldConfig {
  key: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox';
  required?: boolean;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

interface SimpleFormProps {
  fields: FieldConfig[];
  onSubmit: (data: any) => void;
  initialData?: any;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

const SimpleForm: React.FC<SimpleFormProps> = ({
  fields,
  onSubmit,
  initialData = {},
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
}) => {
  const [formData, setFormData] = useState(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (
        field.required &&
        (!formData || !formData[field.key] || formData[field.key] === '')
      ) {
        newErrors[field.key] = `${field.label} est requis`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = (formData && formData[field.key]) || '';
    const error = errors[field.key];

    switch (field.type) {
      case 'select':
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(renderField)}

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default SimpleForm;
