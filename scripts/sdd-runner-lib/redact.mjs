import { createHash } from 'node:crypto';

export function createRedactor(...policies) {
  const values = new Set();
  const patterns = [];
  for (const policy of policies) {
    for (const value of policy?.values || []) if (value) values.add(value);
    for (const source of policy?.patterns || []) patterns.push(new RegExp(source, 'g'));
  }
  return (input) => {
    let output = String(input ?? '');
    for (const value of [...values].sort((a, b) => b.length - a.length)) output = output.split(value).join('[REDACTED]');
    for (const pattern of patterns) output = output.replace(pattern, '[REDACTED]');
    return output;
  };
}

export function redactValue(value, redact) {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item, redact));
  if (value && typeof value === 'object') {
    const used = new Set();
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      const redactedKey = redact(key);
      const baseKey = redactedKey === key ? key : `redacted-${hashKey(key)}`;
      let outputKey = baseKey;
      let suffix = 1;
      while (used.has(outputKey)) outputKey = `${baseKey}__${suffix++}`;
      used.add(outputKey);
      return [outputKey, redactValue(item, redact)];
    }));
  }
  return value;
}

function hashKey(key) { return createHash('sha256').update(key).digest('hex').slice(0, 16); }
