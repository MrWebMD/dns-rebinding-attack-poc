import * as dns from "dns";
import axios from "axios";

const sleep = (t: number) => new Promise((resolve) => setTimeout(resolve, t));

/**
 *
 * Get a list of all DNS records for the specified cloudflare zone id
 * @param zoneid Cloudflare zone id
 */
export async function getAllDnsRecords(zoneid: string): Promise<DnsRecord[]> {
  var options = {
    method: "GET",
    url: `https://api.cloudflare.com/client/v4/zones/${zoneid}/dns_records`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CF_API_KEY!}`,
    },
  };
  return await axios.request(options).then((response: { data: { result: DnsRecord[] } }) => {
    return response.data.result;
  });
}

/**
 * Resolve a domain name to an ip address
 * @param domain coolwebsite.com
 */
export const resolveDomainName = (domain: string) =>
  new Promise<string[]>((resolve, reject) => {
    dns.resolve(domain, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });

/**
 * Update a dns record
 * @param dnsRecordData
 */
export async function updateDnsRecord(
  dnsRecordData: AtLeast<DnsRecord, "content" | "name" | "type" | "ttl" | "zone_id" | "id">
): Promise<DnsRecord> {
  var options = {
    method: "PUT",
    url: `https://api.cloudflare.com/client/v4/zones/${dnsRecordData.zone_id}/dns_records/${dnsRecordData.id}`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CF_API_KEY!}`,
    },
    data: dnsRecordData,
  };

  return await axios.request(options).then((response: { data: { result: DnsRecord } }) => {
    return response.data.result;
  });
}

export const waitForResolution = (
  ipaddress: string,
  domain: string,
  retryAttempts: number,
  retryInterval: number
): Promise<string[]> =>
  new Promise(async (resolve, reject) => {
    let resolution = [];

    for (let dnsLookupCount = 0; dnsLookupCount < retryAttempts; dnsLookupCount++) {
      console.log(
        `Waiting for ${domain} to resolve to ${ipaddress} ${dnsLookupCount}/${retryAttempts}`
      );
      try {
        resolution = await resolveDomainName(domain);

        if (resolution[0] !== ipaddress) {
          await sleep(retryInterval);
        } else {
          console.log("Resolved ", JSON.stringify(resolution));
          return resolve(resolution);
        }
      } catch (err) {
        console.log(err);
      }
    }
    console.log("Failed to resolve");
    reject();
  });
