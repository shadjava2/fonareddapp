import { cn, debounce } from '@/lib/utils';
import {
  CheckIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

function normalizeSearch(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface AutocompleteSelectProps {
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** id sur l’input (accessibilité : lier un label externe via htmlFor) */
  inputId?: string;
  /**
   * Si true, les options ne sont pas filtrées localement : le parent fournit
   * la liste déjà filtrée (ex. résultats API).
   */
  externalFilter?: boolean;
  /** Appelé avec debounce quand la saisie change (recherche serveur). */
  onSearchQueryChange?: (query: string) => void;
  /** Délai debounce pour onSearchQueryChange (ms). */
  searchDebounceMs?: number;
  /** Indicateur de chargement (liste en cours de récupération). */
  loading?: boolean;
}

const AutocompleteSelect: React.FC<AutocompleteSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  label,
  required = false,
  error,
  disabled = false,
  className = '',
  inputId,
  externalFilter = false,
  onSearchQueryChange,
  searchDebounceMs = 280,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedNotifyParent = useMemo(() => {
    if (!onSearchQueryChange) return null;
    return debounce((q: string) => {
      onSearchQueryChange(q);
    }, searchDebounceMs);
  }, [onSearchQueryChange, searchDebounceMs]);

  // Trouver l'option sélectionnée
  const selectedOption = options.find((option) => option.value === value);

  // Filtrer les options basées sur le terme de recherche (local = temps réel)
  const filteredOptions = externalFilter
    ? options
    : (() => {
        const q = normalizeSearch(searchTerm);
        if (!q) return options;
        return options.filter((option) =>
          normalizeSearch(option.label).includes(q)
        );
      })();

  // Gérer la sélection d'une option
  const handleSelect = (option: Option) => {
    if (!option.disabled) {
      onChange(option.value);
      setSearchTerm(option.label);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Gérer les changements dans l'input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
    setHighlightedIndex(-1);

    debouncedNotifyParent?.(newSearchTerm);

    // Si l'utilisateur efface tout, désélectionner
    if (newSearchTerm === '') {
      onChange(null);
    }
  };

  // Gérer le focus
  const handleFocus = () => {
    setIsOpen(true);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    }
  };

  // Gérer le clic sur le bouton dropdown
  const handleDropdownClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        inputRef.current?.focus();
      }
    }
  };

  // Gérer les touches du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
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
        setHighlightedIndex(-1);
        break;
    }
  };

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
        // Restaurer la valeur sélectionnée si l'utilisateur n'a rien sélectionné
        if (selectedOption && searchTerm !== selectedOption.label) {
          setSearchTerm(selectedOption.label);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, searchTerm]);

  // Mettre à jour le terme de recherche quand la valeur change
  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    } else {
      setSearchTerm('');
    }
  }, [selectedOption]);

  // Clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(null);
      setSearchTerm('');
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

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

  const dropdownBody = (() => {
    if (loading && filteredOptions.length === 0) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-indigo-600 animate-pulse">
            Recherche des agents…
          </p>
        </div>
      );
    }
    if (filteredOptions.length === 0) {
      return (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">
            Aucun résultat — affinez la recherche (nom, prénom, identifiant)
          </p>
        </div>
      );
    }
    return (
      <ul role="listbox" className="py-1.5 sm:py-1">
        {filteredOptions.map((option, index) => (
          <li
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            onClick={() => handleSelect(option)}
            className={cn(
              'relative px-4 min-h-[48px] sm:min-h-0 py-3.5 sm:py-2.5 cursor-pointer',
              'transition-colors duration-150',
              'flex items-center justify-between gap-2',
              'active:bg-gray-100 sm:active:bg-transparent',
              {
                'bg-indigo-50 text-indigo-900': option.value === value,
                'bg-indigo-100 text-indigo-900':
                  index === highlightedIndex && option.value !== value,
                'hover:bg-gray-50':
                  index !== highlightedIndex && option.value !== value,
                'opacity-50 cursor-not-allowed': option.disabled,
              }
            )}
          >
            <span className="flex-1 text-[0.9375rem] sm:text-sm leading-snug break-words line-clamp-3 sm:line-clamp-none sm:truncate">
              {option.label}
            </span>
            {option.value === value && (
              <CheckIcon className="h-5 w-5 text-indigo-600 flex-shrink-0 ml-2" />
            )}
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center text-[0.9375rem] sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Input avec icône de recherche */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-3 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-autocomplete="list"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full pl-10 sm:pl-10 pr-[5.25rem] sm:pr-20',
              'min-h-[48px] sm:min-h-[44px] py-3 border rounded-xl sm:rounded-lg shadow-sm',
              'text-base sm:text-sm leading-snug',
              'bg-white focus:outline-none focus:ring-2 focus:ring-offset-1',
              'transition-all duration-200 ease-in-out',
              'placeholder:text-gray-400',
              {
                'border-red-300 focus:border-red-500 focus:ring-red-500': error,
                'border-gray-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-500':
                  !error && !disabled,
                'bg-gray-50 cursor-not-allowed opacity-60': disabled,
                'ring-2 ring-indigo-500 ring-offset-1 border-indigo-500':
                  isOpen && !error,
              }
            )}
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-1 sm:pr-2 gap-0.5">
            {selectedOption && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors group"
                aria-label="Effacer la sélection"
              >
                <XMarkIcon className="h-5 w-5 sm:h-4 sm:w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            )}
            <button
              type="button"
              onClick={handleDropdownClick}
              disabled={disabled}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:p-1 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
            >
              <ChevronDownIcon
                className={cn(
                  'h-5 w-5 text-gray-400 transition-transform duration-200',
                  isOpen && 'transform rotate-180 text-indigo-500'
                )}
              />
            </button>
          </div>
        </div>

        {/* Dropdown avec animations */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 left-0 right-0 w-full mt-2 sm:mt-2 bg-white rounded-xl sm:rounded-lg shadow-xl',
              'border border-gray-200 overflow-hidden',
              'transform transition-all duration-200 ease-out'
            )}
            style={{
              animation: 'fadeIn 0.2s ease-out forwards',
            }}
          >
            <div
              className="max-h-[min(52vh,17.5rem)] sm:max-h-60 overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch]"
              id={inputId ? `${inputId}-listbox` : undefined}
            >
              {dropdownBody}
              {loading && filteredOptions.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
                  Mise à jour de la liste…
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error message avec animation */}
      {error && (
        <p className="mt-2 text-[0.9375rem] sm:text-sm text-red-600 flex items-start gap-1.5 leading-snug">
          <ExclamationCircleIcon className="h-5 w-5 sm:h-4 sm:w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default AutocompleteSelect;
