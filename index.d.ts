type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

interface DnsRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
    source: string;
  };
  comment: any;
  tags: any[];
  created_on: string;
  modified_on: string;
}
