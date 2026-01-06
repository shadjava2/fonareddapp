import { cn } from '@/lib/utils';
import React, { useId, useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || useId();
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="label">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="h-5 w-5 text-gray-400">{leftIcon}</div>
            </div>
          )}
          <input
            type={isPassword && showPassword ? 'text' : type}
            id={inputId}
            className={cn(
              'input',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              error && 'input-error',
              className
            )}
            ref={ref}
            {...props}
          />
          {(rightIcon || isPassword) && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon ? (
                <div className="h-5 w-5 text-gray-400">{rightIcon}</div>
              ) : (
                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? 'Masquer le mot de passe'
                      : 'Afficher le mot de passe'
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
                >
                  {showPassword ? (
                    // eye-slash icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 15.338 6.41 18 12 18c.88 0 1.706-.082 2.478-.238M6.228 6.228A10.45 10.45 0 0 1 12 6c5.59 0 8.774 2.662 10.066 6-.392 1.03-.985 1.992-1.748 2.838M6.228 6.228 3 3m3.228 3.228 11.544 11.544M21 21l-3.182-3.182M9.88 9.88a3 3 0 0 0 4.243 4.243"
                      />
                    </svg>
                  ) : (
                    // eye icon
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M2.25 12s2.25-6.75 9.75-6.75S21.75 12 21.75 12 19.5 18.75 12 18.75 2.25 12 2.25 12Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  )}
                </button>
              )}
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
  }
);

Input.displayName = 'Input';

export default Input;
