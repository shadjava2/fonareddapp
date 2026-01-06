import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  searchable?: boolean;
  className?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Sélectionner...',
  options,
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  searchable = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (selectedValue: string | number) => {
    onChange?.(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="label">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={cn(
            'input flex items-center justify-between cursor-pointer',
            error && 'input-error',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className={cn(
            'block truncate',
            !selectedOption && 'text-gray-500'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon
            className={cn(
              'h-5 w-5 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b border-gray-200">
                <input
                  ref={searchRef}
                  type="text"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}
            <ul className="py-1" role="listbox">
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500">
                  Aucune option trouvée
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    className={cn(
                      'px-3 py-2 text-sm cursor-pointer transition-colors',
                      option.value === value && 'bg-primary-100 text-primary-700',
                      index === highlightedIndex && 'bg-gray-100',
                      option.disabled && 'opacity-50 cursor-not-allowed',
                      !option.disabled && 'hover:bg-gray-100'
                    )}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    role="option"
                    aria-selected={option.value === value}
                  >
                    {option.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
