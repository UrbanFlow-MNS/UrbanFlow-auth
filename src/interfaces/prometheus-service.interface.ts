export interface IPrometheusService {
  getMetrics(): Promise<string>;
}
