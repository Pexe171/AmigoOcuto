import { env } from '../config/environment';

type CounterKey = string;

type Summary = {
  sum: number;
  count: number;
};

const httpCounters = new Map<CounterKey, number>();
const httpDurations = new Map<CounterKey, Summary>();
const cronCounters = new Map<CounterKey, number>();
const cronDurations = new Map<CounterKey, Summary>();
const authCounters = new Map<CounterKey, number>();

const buildKey = (labels: Record<string, string>): string =>
  Object.entries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('|');

const formatLabels = (labels: Record<string, string>): string =>
  Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');

const addToCounter = (map: Map<CounterKey, number>, labels: Record<string, string>, value = 1): void => {
  const key = buildKey(labels);
  const current = map.get(key) ?? 0;
  map.set(key, current + value);
};

const addToSummary = (map: Map<CounterKey, Summary>, labels: Record<string, string>, observation: number): void => {
  const key = buildKey(labels);
  const summary = map.get(key) ?? { sum: 0, count: 0 };
  summary.sum += observation;
  summary.count += 1;
  map.set(key, summary);
};

export const metricsEnabled = env.ENABLE_HTTP_METRICS;

export const recordHttpMetric = (
  method: string,
  route: string,
  statusCode: number,
  durationMs: number,
): void => {
  const labels = { method, route, status_code: statusCode.toString() };
  addToCounter(httpCounters, labels, 1);
  addToSummary(httpDurations, { method, route }, durationMs / 1000);
};

export const recordCronMetric = (job: string, status: 'success' | 'error', durationSeconds: number): void => {
  addToCounter(cronCounters, { job, status }, 1);
  addToSummary(cronDurations, { job }, durationSeconds);
};

export const recordAuthMetric = (subject: string, outcome: string): void => {
  addToCounter(authCounters, { subject, outcome }, 1);
};

const formatCounter = (name: string, map: Map<CounterKey, number>): string =>
  Array.from(map.entries())
    .map(([key, value]) => `${name}{${formatLabels(Object.fromEntries(key.split('|').map((pair) => pair.split('='))))}} ${value}`)
    .join('\n');

const formatSummary = (name: string, map: Map<CounterKey, Summary>): string =>
  Array.from(map.entries())
    .map(([key, { sum, count }]) => {
      const labels = Object.fromEntries(key.split('|').map((pair) => pair.split('=')));
      const serialized = formatLabels(labels);
      return `${name}_sum{${serialized}} ${sum}\n${name}_count{${serialized}} ${count}`;
    })
    .join('\n');

export const exportMetrics = (): string => {
  const sections = [
    '# HELP http_requests_total Total de requisições HTTP',
    '# TYPE http_requests_total counter',
    formatCounter('http_requests_total', httpCounters),
    '# HELP http_request_duration_seconds Duração das requisições HTTP',
    '# TYPE http_request_duration_seconds summary',
    formatSummary('http_request_duration_seconds', httpDurations),
    '# HELP cron_jobs_total Total de execuções de jobs cron',
    '# TYPE cron_jobs_total counter',
    formatCounter('cron_jobs_total', cronCounters),
    '# HELP cron_job_duration_seconds Duração dos jobs cron',
    '# TYPE cron_job_duration_seconds summary',
    formatSummary('cron_job_duration_seconds', cronDurations),
    '# HELP auth_audit_events_total Total de eventos de auditoria de autenticação',
    '# TYPE auth_audit_events_total counter',
    formatCounter('auth_audit_events_total', authCounters),
  ];

  return sections.filter(Boolean).join('\n');
};
