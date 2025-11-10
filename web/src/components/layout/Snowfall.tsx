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
      Array.from({ length: 120 }, (_, index) => ({
        id: index,
        size: `${(index % 6) + 3}px`,
        left: `${(index * 13) % 100}%`,
        delay: `${(index % 12) * 0.6}s`,
        duration: `${8 + (index % 10)}s`,
        opacity: 0.35 + (index % 5) * 0.1,
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
