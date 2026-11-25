const YAML_SIMPLE_ESCAPES = {
  "0": "\0",
  a: "\x07",
  b: "\b",
  t: "\t",
  n: "\n",
  v: "\v",
  f: "\f",
  r: "\r",
  e: "\x1b",
  " ": " ",
  '"': '"',
  "/": "/",
  "\\": "\\",
  N: "\u0085",
  _: "\u00a0",
  L: "\u2028",
  P: "\u2029"
};
const YAML_HEX_ESCAPE_LENGTHS = {x: 2, u: 4, U: 8};

export function hasClosingYamlQuote(value, quote) {
  for (let i = 1; i < value.length; i += 1) {
    if (value[i] !== quote) {
      continue;
    }
    if (quote === "'" && value[i + 1] === "'") {
      i += 1;
      continue;
    }
    let backslashes = 0;
    for (let j = i - 1; j >= 0 && value[j] === "\\"; j -= 1) {
      backslashes += 1;
    }
    if (quote === "'" || backslashes % 2 === 0) {
      return true;
    }
  }
  return false;
}

function decodeDoubleQuotedYaml(value) {
  let decoded = "";
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "\\" || i === value.length - 1) {
      decoded += value[i];
      continue;
    }
    const escape = value[i + 1];
    if (escape === "\n" || escape === "\r") {
      i += escape === "\r" && value[i + 2] === "\n" ? 2 : 1;
      while (value[i + 1] === " " || value[i + 1] === "\t") {
        i += 1;
      }
      continue;
    }
    if (Object.hasOwn(YAML_SIMPLE_ESCAPES, escape)) {
      decoded += YAML_SIMPLE_ESCAPES[escape];
      i += 1;
      continue;
    }
    const hexLength = YAML_HEX_ESCAPE_LENGTHS[escape];
    if (hexLength) {
      const hex = value.slice(i + 2, i + 2 + hexLength);
      const codePoint = hex.length === hexLength && /^[\da-f]+$/i.test(hex)
          ? Number.parseInt(hex, 16) : -1;
      if (codePoint >= 0 && codePoint <= 0x10ffff) {
        decoded += String.fromCodePoint(codePoint);
        i += hexLength + 1;
        continue;
      }
    }
    decoded += value[i];
  }
  return decoded;
}

export function parseYamlStringScalar(raw) {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim();
  if (!value || value.startsWith("#")) {
    return null;
  }
  if (value.startsWith('"')) {
    const quoted = value.match(
        /^"((?:[^"\\]|\\[\s\S])*)"(?:[ \t]+#[^\r\n]*)?[ \t]*$/);
    return quoted ? decodeDoubleQuotedYaml(quoted[1]) : null;
  }
  if (value.startsWith("'")) {
    const quoted = value.match(
        /^'((?:[^']|'')*)'(?:[ \t]+#[^\r\n]*)?[ \t]*$/);
    return quoted ? quoted[1].replace(/''/g, "'") : null;
  }
  const comment = value.search(/[ \t]+#/);
  const scalar = (comment < 0 ? value : value.slice(0, comment)).trim();
  if (!scalar || /^(?:null|~|true|false)$/i.test(scalar) ||
      /^[+-]?(?:(?:0|[1-9][\d_]*)(?:\.[\d_]*)?(?:e[+-]?[\d_]+)?|0x[\da-f_]+|0o[0-7_]+|0b[01_]+|\.inf|\.nan)$/i.test(scalar)) {
    return null;
  }
  return scalar;
}