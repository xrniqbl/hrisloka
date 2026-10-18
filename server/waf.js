/**
 * server/waf.js — Web Application Firewall middleware (Express).
 *
 * Committed to repo (previously VPS-only, which broke clean-checkout boot).
 * Blocks scanners, known-bad paths, and common attack patterns before
 * static/API handlers. In-memory hit counter + console.warn logging.
 * For persistent bans use nginx deny / fail2ban (see deploy/nginx.kinikerja.conf).
 */

const SCANNER_UA = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'nessus', 'openvas',
  'acunetix', 'netsparker', 'wpscan', 'dirbuster', 'gobuster',
  'hydra', 'medusa', 'ncrack', 'burp', 'zap', 'owasp',
  'metasploit', 'cobalt', 'qualys', 'shodan', 'censys',
  'python-requests', 'go-http-client',
  'libwww-perl', 'httpclient', 'okhttp',
];

const BAD_PATH_RE = /(\/wp-(admin|login|content|includes)|\/xmlrpc\.php|\/phpmyadmin|\/pma\/|\/actuator|\/console\/|\/_profiler\/|\/debug\/|\/server-status|\/\.git(\/|$)|\/\.env(\.|$)|\/\.svn\/|\/\.hg\/|\/\.aws\/|\/\.DS_Store|\/crossdomain\.xml|~$|\.bak$|\.sql$|\/backup(\/|$)|\/shell(\/|$)|\/cmd(\/|$)|\/eval(\/|$))/i;

const ATTACK_QS_RE = /(union(\s|\+|%20)+select|union(\s|\+|%20)+all(\s|\+|%20)+select|\.\.(\/|\\|%2f|%5c)|;\s*--|<\s*script|['"]\s*(or|and)\s+['"0-9]|sleep\s*\(|benchmark\s*\(|load_file\s*\(|into\s+(outfile|dumpfile))/i;

const hits = new Map(); // ip -> count (observability only)

export function waf(req, res, next) {
  const ua = String(req.headers['user-agent'] || '').toLowerCase();
  const url = String(req.originalUrl || req.url || '');

  if (SCANNER_UA.some((s) => ua.includes(s))) {
    hits.set(req.ip, (hits.get(req.ip) || 0) + 1);
    console.warn(`[waf] scanner UA blocked: ${req.ip} ${ua.slice(0, 80)}`);
    return res.status(404).send('Not Found');
  }
  if (BAD_PATH_RE.test(url)) {
    hits.set(req.ip, (hits.get(req.ip) || 0) + 1);
    console.warn(`[waf] bad path blocked: ${req.ip} ${url.slice(0, 120)}`);
    return res.status(404).send('Not Found');
  }
  const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  if (qs && ATTACK_QS_RE.test(qs)) {
    hits.set(req.ip, (hits.get(req.ip) || 0) + 1);
    console.warn(`[waf] attack pattern blocked: ${req.ip} ${qs.slice(0, 120)}`);
    return res.status(400).json({ error: 'Bad request' });
  }
  next();
}

export function wafStats() {
  return { tracked_ips: hits.size };
}
