import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SRC = path.join(here, "wordlists");
const OUT_JS = path.join(root, "src", "profanity-words.js");
const OUT_SQL = path.join(root, "db", "profanity.sql");
const LANGS = ["en", "fr", "es", "de", "pt", "ru", "tr"];

const LOOKALIKE = {
  "а": "a", "в": "b", "е": "e", "ѕ": "s", "і": "i", "ј": "j", "к": "k",
  "м": "m", "о": "o", "р": "p", "с": "c", "т": "t", "у": "y", "х": "x"
};

const FOLD = {
  "ß": "ss", "æ": "ae", "œ": "oe", "þ": "th",
  "ø": "o", "ł": "l", "đ": "d", "ğ": "g", "ı": "i", "ş": "s"
};

const AMBIGUOUS = [
  "ass", "con", "cul", "cum", "bite", "butt", "caca", "cock", "coon", "fag",
  "gol", "got", "gote", "gotu", "mose", "pipi", "saco", "sex", "sexo",
  "sexy", "sik", "sike", "siki", "tit", "tits", "mong", "pede", "poof",
  "poon", "asno", "cona", "cono", "culo", "foda", "hure", "meuf", "nude",
  "puta", "pute", "suce", "suck", "byk", "xana", "uboy", "zizi", "fdp",
  "жид", "фига", "хрен", "мент", "секс", "puto", "spic", "guro"
];

const DROP = ["trio", "am", "ami", "xx", "cu", "sm", "pis", "pau", "mama"];

const CURATED = [
  "kys", "killyourself", "heilhitler", "siegheil", "gaschamber", "whitepower",
  "fock", "fuk", "fuq", "fvck", "phuck", "motherfucker", "cocksucker",
  "batard", "bougnoule", "negresse", "tapette", "pedale", "tafiole",
  "enfoire", "salopard", "connard", "connasse", "pouffiasse", "niquer",
  "niquez", "ntm", "encule", "enculer", "branler", "branleur", "gogole",
  "trisomique", "mongolien", "bamboula", "youpin", "bicot", "chintok",
  "puto", "chingar", "chinga", "pendejo", "gilipollas", "cabron", "culero",
  "verga", "pinche", "mamada", "malparido", "hijueputa", "sudaca", "maricona",
  "scheisse", "scheiss", "wichser", "hurensohn", "arschloch", "fotze",
  "schlampe", "nutte", "judensau", "kanake", "spasti", "missgeburt",
  "buceta", "viado", "veado", "arrombado", "corno", "otario", "vagabunda",
  "piranha", "caralho", "foder", "fodase", "boiola", "bicha",
  "blyad", "blyat", "suka", "mudak", "pidor", "pidar", "gandon", "zalupa",
  "drochit", "ueban", "pizda", "ebal", "huyna", "hohol", "chmo", "pidaras",
  "хуй", "хуе", "пизд", "ебан", "блядь", "блят", "сука", "мудак", "пидор",
  "пидар", "гандон", "залуп", "дрочи", "уебок", "хохол", "чурка",
  "amcik", "sikeyim", "sikerim", "orospu", "yarrak", "yarram", "gotveren",
  "ibne", "pezevenk", "kahpe", "anasini", "avradini", "sikik", "piclik"
];

const ACCENT_FROM = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿøłđğışйёșțčšžřěůőűāēīōūąęćśźżń";
const ACCENT_TO = "aaaaaaceeeeiiiinooooouuuuyyoldgisиеstcszreuouaeiouaecszzn";
const LEET_FROM = "013456789@$!|+авеѕіјкморстух";
const LEET_TO = "oieasgtbgasiitabesijkmopctyx";
const LETTERS = "a-zабвгдежзийклмнопрстуфхцчшщъыьэюяё";

if (ACCENT_FROM.length !== ACCENT_TO.length) {
  throw new Error("accent " + ACCENT_FROM.length + "/" + ACCENT_TO.length);
}
if (LEET_FROM.length !== LEET_TO.length) {
  throw new Error("leet " + LEET_FROM.length + "/" + LEET_TO.length);
}

function fold(text) {
  let out = "";
  for (const ch of String(text).toLowerCase()) {
    out += FOLD[ch] !== undefined ? FOLD[ch] : ch;
  }
  return out;
}

function stripDiacritics(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function translit(text) {
  let out = "";
  for (const ch of text) {
    out += LOOKALIKE[ch] !== undefined ? LOOKALIKE[ch] : ch;
  }
  return out;
}

function compact(raw) {
  return translit(stripDiacritics(fold(raw)).replace(/[^a-zЀ-ӿ]/g, ""));
}

const ambiguous = new Set(AMBIGUOUS.map(compact));
const dropped = new Set(DROP.map(compact));
const long = new Set();
const short = new Set();

function add(raw) {
  const word = compact(raw);
  if (word.length < 3 || dropped.has(word)) {
    return;
  }
  if (ambiguous.has(word)) {
    short.add(word);
  } else {
    long.add(word);
  }
}

for (const lang of LANGS) {
  const file = path.join(SRC, lang + ".txt");
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    add(line);
  }
}
for (const word of CURATED) {
  add(word);
}
for (const word of AMBIGUOUS) {
  add(word);
}

const LONG = Array.from(long).sort();
const SHORT = Array.from(short).sort();

fs.writeFileSync(
  OUT_JS,
  "export const LONG = " + JSON.stringify(LONG) + ";\n\n" +
  "export const SHORT = " + JSON.stringify(SHORT) + ";\n",
  "utf8"
);

const { ALLOW } = await import(new URL("../src/profanity.js", import.meta.url));

function lit(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function rows(list, kind) {
  return list.map(function (w) {
    return "  (" + lit(w) + ", " + lit(kind) + ")";
  }).join(",\n");
}

const sql = `create table if not exists public.profanity_words (
  word text primary key,
  kind text not null check (kind in ('long', 'short', 'allow'))
);

alter table public.profanity_words enable row level security;

truncate table public.profanity_words;

insert into public.profanity_words (word, kind) values
${rows(LONG, "long")},
${rows(SHORT, "short")},
${rows(ALLOW, "allow")};

create or replace function public.pseudo_fold(p_text text)
returns text
language sql
immutable
as $$
  select translate(
    translate(
      replace(replace(replace(replace(lower(coalesce(p_text, '')),
        'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), 'þ', 'th'),
      ${lit(ACCENT_FROM)},
      ${lit(ACCENT_TO)}
    ),
    ${lit(LEET_FROM)},
    ${lit(LEET_TO)}
  );
$$;

create or replace function public.pseudo_compact(p_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(public.pseudo_fold(p_text), '[^${LETTERS}]', '', 'g');
$$;

create or replace function public.is_profane(p_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  compact_form text;
  collapsed text;
  stripped text;
  stripped_collapsed text;
  tokens text[];
  entry record;
begin
  compact_form := public.pseudo_compact(p_text);
  if compact_form = '' then
    return false;
  end if;

  collapsed := regexp_replace(compact_form, '(.)\\1+', '\\1', 'g');
  stripped := compact_form;
  stripped_collapsed := collapsed;

  for entry in select word from public.profanity_words where kind = 'allow' loop
    stripped := replace(stripped, entry.word, '');
    stripped_collapsed := replace(
      stripped_collapsed,
      regexp_replace(entry.word, '(.)\\1+', '\\1', 'g'),
      ''
    );
  end loop;

  if exists (
    select 1 from public.profanity_words w
    where w.kind = 'long'
      and (position(w.word in stripped) > 0 or position(w.word in stripped_collapsed) > 0)
  ) then
    return true;
  end if;

  if exists (
    select 1 from public.profanity_words w
    where w.kind = 'short' and (w.word = compact_form or w.word = collapsed)
  ) then
    return true;
  end if;

  tokens := regexp_split_to_array(public.pseudo_fold(p_text), '[^${LETTERS}]+');
  if exists (
    select 1 from public.profanity_words w
    where w.kind = 'short' and w.word = any(tokens)
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.profiles_pseudo_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.pseudo is not distinct from old.pseudo then
    return new;
  end if;
  if public.is_profane(new.pseudo) then
    raise exception 'pseudo_profane' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_pseudo_guard on public.profiles;

create trigger profiles_pseudo_guard
  before insert or update of pseudo on public.profiles
  for each row execute function public.profiles_pseudo_guard();

grant execute on function public.pseudo_fold(text) to authenticated;
grant execute on function public.pseudo_compact(text) to authenticated;
grant execute on function public.is_profane(text) to authenticated;
`;

fs.writeFileSync(OUT_SQL, sql, "utf8");

console.log("long: " + LONG.length + "  short: " + SHORT.length + "  allow: " + ALLOW.length);
console.log("ecrit: src/profanity-words.js et db/profanity.sql");
