import React, { useId, useState } from 'react';
import styles from './Input.module.css';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  floatingLabel?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  floatingLabel = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  id,
  placeholder,
  value,
  onChange,
  onBlur,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const generatedId = useId();
  const hasValue = Boolean(value);

  const inputId = id || `input-${generatedId}`;

  const classNames = [
    styles.inputWrapper,
    fullWidth && styles.fullWidth,
    error && styles.hasError,
    focused && styles.focused,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      {label && !floatingLabel && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.inputContainer}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          id={inputId}
          className={styles.input}
          placeholder={floatingLabel ? '' : placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
      </div>

      {floatingLabel && (
        <label
          htmlFor={inputId}
          className={`${styles.floatingLabel} ${(focused || hasValue) && styles.floatingLabelActive}`}
        >
          {label}
        </label>
      )}

      {error && <span className={styles.errorMessage}>{error}</span>}
    </div>
  );
};