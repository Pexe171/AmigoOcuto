import React from 'react';
import { cardBaseClass, pageSectionClass, badgeClass } from '../styles/theme';

export type FestiveCardProps = {
  title: string;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  maxWidth?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

const FestiveCard: React.FC<FestiveCardProps> = ({
  title,
  description,
  eyebrow,
  maxWidth = 'max-w-3xl',
  children,
  actions
}) => {
  return (
    <section className={`${pageSectionClass}`}>
      <div className={`${cardBaseClass} ${maxWidth}`}>
        <header className="space-y-4 text-center">
          {eyebrow && (
            <p className={`${badgeClass}`} style={{ fontFamily: "'Merriweather', serif" }}>
              {eyebrow}
            </p>
          )}
          <h2
            className="text-3xl md:text-4xl font-bold text-white"
            style={{ fontFamily: "'Merriweather', serif" }}
          >
            {title}
          </h2>
          {description && (
            <div
              className="mx-auto max-w-2xl text-base text-white/85 space-y-2"
              style={{ fontFamily: "'Merriweather', serif" }}
            >
              {description}
            </div>
          )}
          {actions && <div className="flex justify-center pt-2">{actions}</div>}
        </header>
        <div className="mt-10 space-y-6">{children}</div>
      </div>
    </section>
  );
};

export default FestiveCard;
