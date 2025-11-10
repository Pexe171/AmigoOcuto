import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import {
  primaryButtonClass,
  secondaryButtonClass,
  dangerButtonClass,
  ghostButtonClass,
} from '../../styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  to?: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClassMap: Record<ButtonVariant, string> = {
  primary: primaryButtonClass,
  secondary: secondaryButtonClass,
  danger: dangerButtonClass,
  ghost: ghostButtonClass,
};

export const Button = ({ to, children, variant = 'primary', className = '', type, ...props }: ButtonProps): JSX.Element => {
  const composedClass = `${variantClassMap[variant]} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={composedClass} {...(props as never)}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type ?? 'button'} className={composedClass} {...props}>
      {children}
    </button>
  );
};
