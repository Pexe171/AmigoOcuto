import React from 'react';

type DashboardTone = 'neutral' | 'success' | 'warning';

type DashboardStatCardProps = {
  title: string;
  value: number | string;
  description?: string;
  tone?: DashboardTone;
};

const toneStyles: Record<DashboardTone, string> = {
  neutral: 'border-white/20 bg-white/10 text-white',
  success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-50',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-50',
};

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  title,
  value,
  description,
  tone = 'neutral',
}) => (
  <div
    className={`rounded-3xl border px-6 py-5 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:scale-[1.01] ${toneStyles[tone]}`}
  >
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
      {title}
    </p>
    <p className="mt-3 text-4xl font-bold leading-none">{value}</p>
    {description && <p className="mt-3 text-sm opacity-80">{description}</p>}
  </div>
);

export default DashboardStatCard;
