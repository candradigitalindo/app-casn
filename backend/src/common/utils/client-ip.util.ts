import { BlockList, isIP } from 'net';

// Sumber: https://www.cloudflare.com/ips-v4/ dan /ips-v6/, diperiksa 19-10-2026.
const ranges = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];
const cloudflare = new BlockList();
for (const range of ranges) {
  const [ip, bits] = range.split('/');
  cloudflare.addSubnet(ip, Number(bits), isIP(ip) === 6 ? 'ipv6' : 'ipv4');
}

export function clientIp(req: {
  ip?: string;
  headers: Record<string, unknown>;
}) {
  const edge = (req.ip ?? '').replace(/^::ffff:/, '');
  const forwarded = req.headers['cf-connecting-ip'];
  // Header ini hanya dipercaya bila peer di luar dua proxy lokal adalah Cloudflare.
  if (
    isIP(edge) &&
    cloudflare.check(edge, isIP(edge) === 6 ? 'ipv6' : 'ipv4') &&
    typeof forwarded === 'string' &&
    isIP(forwarded)
  )
    return forwarded;
  return edge;
}
