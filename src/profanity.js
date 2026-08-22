import { LONG, SHORT } from "./profanity-words.js";

const LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "|": "i",
  "+": "t"
};

const LOOKALIKE = {
  "а": "a",
  "в": "b",
  "е": "e",
  "ѕ": "s",
  "і": "i",
  "ј": "j",
  "к": "k",
  "м": "m",
  "о": "o",
  "р": "p",
  "с": "c",
  "т": "t",
  "у": "y",
  "х": "x"
};

export const ALLOW = [
  "analyst", "analysis", "analog", "canal", "banal",
  "manuscript", "uranus", "janus",
  "dickens", "dickinson", "benedict", "predict", "verdict",
  "shiitake", "scunthorpe",
  "grape", "drape", "scrape", "rapeseed", "therap",
  "scatter", "traffic", "fickle", "pakistan", "fukushima", "quimper",
  "torpedo", "pedometer"
];

const FOLD = {
  "ß": "ss", "æ": "ae", "œ": "oe", "þ": "th",
  "ø": "o", "ł": "l", "đ": "d", "ğ": "g", "ı": "i", "ş": "s"
};

function stripDiacritics(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function fold(raw) {
  let out = "";
  for (const ch of String(raw).toLowerCase()) {
    out += FOLD[ch] !== undefined ? FOLD[ch] : ch;
  }
  return out;
}

function normalize(raw) {
  const lowered = stripDiacritics(fold(raw));
  let out = "";
  for (const ch of lowered) {
    if (LEET[ch] !== undefined) {
      out += LEET[ch];
    } else if (LOOKALIKE[ch] !== undefined) {
      out += LOOKALIKE[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

function lettersOnly(text) {
  return text.replace(/[^a-zЀ-ӿ]/g, "");
}

function collapseRuns(text) {
  let out = "";
  let prev = "";
  for (const ch of text) {
    if (ch !== prev) {
      out += ch;
    }
    prev = ch;
  }
  return out;
}

function withoutAllowed(text, collapsed) {
  let out = text;
  for (const word of ALLOW) {
    const safe = collapsed ? collapseRuns(word) : word;
    if (out.indexOf(safe) !== -1) {
      out = out.split(safe).join("");
    }
  }
  return out;
}

function hasLong(text) {
  for (const word of LONG) {
    if (text.indexOf(word) !== -1) {
      return true;
    }
  }
  return false;
}

export function isProfane(raw) {
  if (raw === null || raw === undefined) {
    return false;
  }
  const normalized = normalize(raw);
  const compact = lettersOnly(normalized);
  if (compact === "") {
    return false;
  }
  if (hasLong(withoutAllowed(compact, false))) {
    return true;
  }
  if (hasLong(withoutAllowed(collapseRuns(compact), true))) {
    return true;
  }
  if (SHORT.indexOf(compact) !== -1 || SHORT.indexOf(collapseRuns(compact)) !== -1) {
    return true;
  }
  const tokens = normalized.split(/[^a-zЀ-ӿ]+/);
  for (const token of tokens) {
    if (token === "") {
      continue;
    }
    if (SHORT.indexOf(token) !== -1 || SHORT.indexOf(collapseRuns(token)) !== -1) {
      return true;
    }
  }
  return false;
}
