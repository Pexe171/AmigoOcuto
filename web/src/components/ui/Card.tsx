import type { PropsWithChildren, HTMLAttributes } from 'react';
import { cardBaseClass } from '../../styles/theme';

export const Card = ({ children, className = '', ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>): JSX.Element => (
  <div className={`${cardBaseClass} ${className}`.trim()} {...props}>
    {children}
  </div>
);
