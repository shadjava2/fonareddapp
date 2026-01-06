import { cn } from '@/lib/utils';
import {
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface ModernSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

const ModernSelect: React.FC<ModernSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionnez...',
  label,
  required = false,
  error,
  disabled = false,
  className = '',
  searchable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trouver l'option sélectionnée
  const selectedOption = options.find((option) => option.value === value);

  // Filtrer les options basées sur le terme de recherche
  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Gérer la sélection d'une option
  const handleSelect = (option: Option) => {
    if (!option.disabled && !disabled) {
      onChange(option.value);
      setSearchTerm('');
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Gérer le clic sur le bouton
  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setTimeout(() => {
          if (searchable && inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      }
    }
  };

  // Gérer les touches du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp'
      ) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(-1);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        break;
    }
  };

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroller vers l'option mise en surbrillance
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(null);
      setSearchTerm('');
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Button trigger - Utiliser un div pour éviter l'imbrication de boutons */}
        <div
          onClick={disabled ? undefined : handleToggle}
          onKeyDown={disabled ? undefined : handleKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          className={cn(
            'w-full relative flex items-center justify-between px-4 py-3',
            'bg-white border rounded-lg shadow-sm',
            'transition-all duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            {
              'border-red-300 focus:border-red-500 focus:ring-red-500': error,
              'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-500 cursor-pointer':
                !error && !disabled,
              'bg-gray-50 cursor-not-allowed opacity-60': disabled,
              'ring-2 ring-indigo-500 ring-offset-1 border-indigo-500':
                isOpen && !error,
            }
          )}
        >
          <span
            className={cn(
              'flex-1 text-left truncate mr-2',
              selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {selectedOption && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear(e);
                }}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors group"
                aria-label="Effacer la sélection"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            )}
            <ChevronDownIcon
              className={cn(
                'h-5 w-5 text-gray-400 transition-transform duration-200',
                isOpen && 'transform rotate-180 text-indigo-500'
              )}
            />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className={cn(
              'absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl',
              'border border-gray-200 overflow-hidden'
            )}
            style={{
              animation: 'fadeIn 0.2s ease-out forwards',
            }}
          >
            {/* Search input */}
            {searchable && (
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Rechercher..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="max-h-60 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">Aucun résultat trouvé</p>
                </div>
              ) : (
                <ul role="listbox" className="py-1">
                  {filteredOptions.map((option, index) => (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={option.value === value}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        'relative px-4 py-2.5 cursor-pointer',
                        'transition-all duration-150',
                        'flex items-center justify-between',
                        {
                          'bg-indigo-50 text-indigo-900':
                            option.value === value,
                          'bg-indigo-100 text-indigo-900':
                            index === highlightedIndex &&
                            option.value !== value,
                          'hover:bg-gray-50':
                            index !== highlightedIndex &&
                            option.value !== value,
                          'opacity-50 cursor-not-allowed': option.disabled,
                        }
                      )}
                    >
                      <span className="flex-1 truncate">{option.label}</span>
                      {option.value === value && (
                        <CheckIcon className="h-5 w-5 text-indigo-600 flex-shrink-0 ml-2" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center animate-in slide-in-from-top-1 duration-200">
          <ExclamationCircleIcon className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};

export default ModernSelect;
