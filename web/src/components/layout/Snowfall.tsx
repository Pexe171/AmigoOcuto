import { useMemo } from 'react';

type Snowflake = {
  id: number;
  size: string;
  left: string;
  delay: string;
  duration: string;
  opacity: number;
};

export const Snowfall = (): JSX.Element => {
  const flakes = useMemo<Snowflake[]>(
    () =>
      Array.from({ length: 300 }, (_, index) => ({
        id: index,
        size: `${(index % 9) + 6}px`,
        left: `${(index * 5) % 100}%`,
        delay: `${(index % 20) * 0.4}s`,
        duration: `${12 + (index % 18)}s`,
        opacity: 0.6 + (index % 4) * 0.1,
      })),
    [],
  );

  return (
    <div className="snow pointer-events-none">
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            width: flake.size,
            height: flake.size,
            left: flake.left,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
            opacity: flake.opacity,
          }}
        />
      ))}
    </div>
  );
};
