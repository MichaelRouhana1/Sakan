/**
 * One-shot generator: 10 editorial line-art Lotties for the listing wizard.
 * Ocean #2F6FED, ink #121826, mist fills. Looping 3s idle + draw-on.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "lottie", "wizard");
mkdirSync(DIR, { recursive: true });

const OCEAN = [0.1843, 0.4353, 0.9294, 1];
const INK = [0.0706, 0.0941, 0.149, 1];
const MIST = [0.91, 0.933, 0.965, 1];
const WHITE = [1, 1, 1, 1];
const FR = 30;
const OP = 90;
const CX = 240;
const CY = 240;

function ease(t0, s0, t1, s1) {
  return [
    {
      i: { x: Array(s0.length).fill(0.42), y: Array(s0.length).fill(1) },
      o: { x: Array(s0.length).fill(0.58), y: Array(s0.length).fill(0) },
      t: t0,
      s: s0,
    },
    { t: t1, s: s1 },
  ];
}

function bounceY(restY, dropFrom = -70) {
  return {
    a: 1,
    k: [
      {
        i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
        o: { x: [0.15, 0.15, 0.15], y: [0, 0, 0] },
        t: 0,
        s: [CX, restY + dropFrom, 0],
      },
      {
        i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
        o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] },
        t: 18,
        s: [CX, restY + 10, 0],
      },
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 28,
        s: [CX, restY - 6, 0],
      },
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 38,
        s: [CX, restY, 0],
      },
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 64,
        s: [CX, restY - 8, 0],
      },
      { t: OP, s: [CX, restY, 0] },
    ],
  };
}

function floatP(amp = 8) {
  return {
    a: 1,
    k: [
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 0,
        s: [CX, CY + amp, 0],
      },
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 45,
        s: [CX, CY - amp, 0],
      },
      { t: OP, s: [CX, CY + amp, 0] },
    ],
  };
}

function pulseScale(lo = 96, hi = 104) {
  return {
    a: 1,
    k: [
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 0,
        s: [lo, lo, 100],
      },
      {
        i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
        o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
        t: 45,
        s: [hi, hi, 100],
      },
      { t: OP, s: [lo, lo, 100] },
    ],
  };
}

function fadeIn(t0 = 0, t1 = 18) {
  return { a: 1, k: ease(t0, [0], t1, [100]) };
}

function tr(extra = {}) {
  return {
    ty: "tr",
    p: { a: 0, k: extra.p ?? [0, 0] },
    a: { a: 0, k: extra.a ?? [0, 0] },
    s: { a: 0, k: extra.s ?? [100, 100] },
    r: { a: 0, k: extra.r ?? 0 },
    o: { a: 0, k: extra.o ?? 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
    nm: "Transform",
  };
}

function st(color, w, dash) {
  const s = {
    ty: "st",
    c: { a: 0, k: color },
    o: { a: 0, k: 100 },
    w: { a: 0, k: w },
    lc: 2,
    lj: 2,
    ml: 4,
    bm: 0,
    nm: "st",
  };
  if (dash) {
    s.d = [
      { n: "o", nm: "offset", v: { a: 0, k: 0 } },
      { n: "d", nm: "dash", v: { a: 0, k: dash[0] } },
      { n: "g", nm: "gap", v: { a: 0, k: dash[1] } },
    ];
  }
  return s;
}

function fl(color, o = 100) {
  return {
    ty: "fl",
    c: { a: 0, k: color },
    o: { a: 0, k: o },
    r: 1,
    bm: 0,
    nm: "fl",
  };
}

function tm(t0, t1) {
  return {
    ty: "tm",
    s: { a: 0, k: 0 },
    e: { a: 1, k: ease(t0, [0], t1, [100]) },
    o: { a: 0, k: 0 },
    m: 1,
    nm: "Trim",
  };
}

function sh(v, closed = true, i, o) {
  const z = v.map(() => [0, 0]);
  return {
    ty: "sh",
    ks: {
      a: 0,
      k: { c: closed, v, i: i ?? z, o: o ?? z },
    },
    nm: "Path",
  };
}

function el(s, p = [0, 0]) {
  return { ty: "el", p: { a: 0, k: p }, s: { a: 0, k: s }, nm: "el" };
}

function rc(s, p, r = 0) {
  return {
    ty: "rc",
    p: { a: 0, k: p },
    s: { a: 0, k: s },
    r: { a: 0, k: r },
    nm: "rc",
  };
}

function gr(name, items, t) {
  return { ty: "gr", nm: name, it: [...items, tr(t)] };
}

function layer(name, ind, shapes, ks = {}) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: ks.o ?? { a: 0, k: 100 },
      r: ks.r ?? { a: 0, k: 0 },
      p: ks.p ?? { a: 0, k: [CX, CY, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: ks.s ?? { a: 0, k: [100, 100, 100] },
    },
    ao: 0,
    shapes,
    ip: 0,
    op: OP,
    st: 0,
    bm: 0,
  };
}

function anim(name, layers) {
  return {
    v: "5.7.4",
    fr: FR,
    ip: 0,
    op: OP,
    w: 480,
    h: 480,
    nm: name,
    ddd: 0,
    assets: [],
    layers,
  };
}

function halo() {
  return layer(
    "halo",
    1,
    [gr("halo", [el([280, 280]), fl(MIST, 100)])],
    { s: pulseScale(92, 108), o: fadeIn(0, 12) },
  );
}

function typeAnim() {
  const roof = sh([
    [-108, -18],
    [0, -128],
    [108, -18],
  ]);
  const body = rc([168, 132], [0, 48], 8);
  const door = rc([36, 64], [0, 82], 4);
  const winL = rc([32, 28], [-48, 18], 4);
  const winR = rc([32, 28], [48, 18], 4);
  const chim = rc([22, 44], [62, -78], 3);
  const ground = sh(
    [
      [-150, 118],
      [150, 118],
    ],
    false,
  );
  return anim("type", [
    halo(),
    layer(
      "house",
      2,
      [
        gr("ground", [ground, st(INK, 5), tm(0, 16)]),
        gr("chimney", [chim, st(INK, 6), fl(MIST, 80), tm(6, 22)]),
        gr("roof", [roof, st(INK, 7), fl(OCEAN, 18), tm(8, 28)]),
        gr("body", [body, st(INK, 6), fl(WHITE, 100), tm(14, 36)]),
        gr("door", [door, fl(OCEAN, 100), st(INK, 4)]),
        gr("winL", [winL, fl(OCEAN, 35), st(INK, 4)]),
        gr("winR", [winR, fl(OCEAN, 35), st(INK, 4)]),
      ],
      { p: floatP(7), o: fadeIn(0, 10) },
    ),
  ]);
}

function locationAnim() {
  const hLines = [-70, 0, 70].map((y, i) =>
    gr(`h${i}`, [sh([[-130, y], [130, y]], false), st(INK, 2, [6, 10]), tm(0, 20)]),
  );
  const vLines = [-70, 0, 70].map((x, i) =>
    gr(`v${i}`, [sh([[x, -110], [x, 110]], false), st(INK, 2, [6, 10]), tm(4, 24)]),
  );
  const ring = (size, t0) =>
    layer(
      `ring${size}`,
      3,
      [gr("r", [el([size, size]), st(OCEAN, 3), tm(t0, t0 + 22)])],
      {
        s: {
          a: 1,
          k: [
            {
              i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
              o: { x: [0.6, 0.6, 0.6], y: [0, 0, 0] },
              t: t0,
              s: [70, 70, 100],
            },
            { t: t0 + 50, s: [130, 130, 100] },
          ],
        },
        o: {
          a: 1,
          k: [
            { t: t0, s: [0] },
            {
              i: { x: [0.4], y: [1] },
              o: { x: [0.6], y: [0] },
              t: t0 + 8,
              s: [70],
            },
            { t: t0 + 50, s: [0] },
          ],
        },
      },
    );
  const pinBody = sh([
    [0, 78],
    [-42, 8],
    [-42, -28],
    [0, -62],
    [42, -28],
    [42, 8],
  ]);
  return anim("location", [
    layer("grid", 1, [...hLines, ...vLines], { o: fadeIn(0, 14) }),
    ring(160, 20),
    ring(220, 40),
    layer(
      "pin",
      6,
      [
        gr("body", [pinBody, fl(OCEAN, 100), st(INK, 5)]),
        gr("hole", [el([28, 28], [0, -18]), fl(WHITE, 100)]),
      ],
      { p: bounceY(CY - 12, -90) },
    ),
  ]);
}

function specsAnim() {
  const outer = rc([220, 180], [0, 8], 10);
  const split = sh(
    [
      [10, -82],
      [10, 98],
    ],
    false,
  );
  const bed = rc([78, 50], [-52, 48], 6);
  const bath = el([36, 36], [62, 50]);
  const kitchen = rc([54, 28], [62, -28], 4);
  return anim("specs", [
    halo(),
    layer(
      "plan",
      2,
      [
        gr("outer", [outer, st(INK, 6), fl(WHITE, 100), tm(0, 24)]),
        gr("split", [split, st(INK, 5), tm(16, 32)]),
        gr("bed", [bed, fl(OCEAN, 28), st(OCEAN, 4), tm(22, 40)]),
        gr("bath", [bath, st(OCEAN, 4), tm(28, 46)]),
        gr("kit", [kitchen, fl(OCEAN, 18), st(INK, 3), tm(32, 50)]),
      ],
      { p: floatP(6) },
    ),
  ]);
}

function utilitiesAnim() {
  const bolt = sh([
    [12, -88],
    [-8, -8],
    [22, -8],
    [-18, 88],
    [4, 12],
    [-28, 12],
  ]);
  const drop = sh([
    [0, -28],
    [-22, 8],
    [0, 32],
    [22, 8],
  ]);
  const sun = el([28, 28], [0, 0]);
  return anim("utilities", [
    halo(),
    layer(
      "bolt",
      2,
      [gr("b", [bolt, fl(OCEAN, 100), st(INK, 5), tm(0, 22)])],
      { p: floatP(8), s: pulseScale(98, 106) },
    ),
    layer(
      "drop",
      3,
      [gr("d", [drop, fl(OCEAN, 55), st(INK, 3)])],
      { p: { a: 0, k: [CX + 92, CY + 48, 0] }, o: fadeIn(18, 32) },
    ),
    layer(
      "sun",
      4,
      [gr("s", [sun, st(INK, 4), fl(OCEAN, 25)])],
      { p: { a: 0, k: [CX - 96, CY + 52, 0] }, o: fadeIn(22, 36) },
    ),
  ]);
}

function person(dx) {
  return [
    gr(`head${dx}`, [el([28, 28], [dx, -42]), fl(OCEAN, 100), st(INK, 4)]),
    gr(
      `body${dx}`,
      [
        sh([
          [dx - 36, 8],
          [dx, -18],
          [dx + 36, 8],
          [dx + 28, 78],
          [dx - 28, 78],
        ]),
        fl(MIST, 100),
        st(INK, 5),
      ],
    ),
  ];
}

function rulesAnim() {
  return anim("rules", [
    halo(),
    layer(
      "people",
      2,
      [...person(-48), ...person(52)],
      { p: floatP(6), o: fadeIn(0, 16) },
    ),
  ]);
}

function photosAnim() {
  const body = rc([170, 118], [0, 8], 18);
  const lens = el([72, 72], [0, 8]);
  const lensIn = el([40, 40], [0, 8]);
  const flash = rc([22, 14], [58, -38], 3);
  const bump = rc([48, 16], [-40, -58], 6);
  return anim("photos", [
    halo(),
    layer(
      "cam",
      2,
      [
        gr("bump", [bump, fl(INK, 100)]),
        gr("body", [body, fl(WHITE, 100), st(INK, 6), tm(0, 20)]),
        gr("lens", [lens, st(INK, 7), fl(OCEAN, 18), tm(10, 28)]),
        gr("lensIn", [lensIn, fl(OCEAN, 100)]),
        gr("flash", [flash, fl(OCEAN, 100)]),
      ],
      {
        p: floatP(6),
        r: {
          a: 1,
          k: [
            {
              i: { x: [0.42], y: [1] },
              o: { x: [0.58], y: [0] },
              t: 0,
              s: [-3],
            },
            {
              i: { x: [0.42], y: [1] },
              o: { x: [0.58], y: [0] },
              t: 45,
              s: [3],
            },
            { t: OP, s: [-3] },
          ],
        },
      },
    ),
    layer(
      "shutter",
      3,
      [gr("burst", [el([220, 220]), fl(WHITE, 100)])],
      {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: 48, s: [0] },
            {
              i: { x: [0.2], y: [1] },
              o: { x: [0.2], y: [0] },
              t: 52,
              s: [55],
            },
            { t: 62, s: [0] },
          ],
        },
      },
    ),
  ]);
}

function pricingAnim() {
  const coin = (name, y, delay) =>
    layer(
      name,
      delay,
      [
        gr("c", [
          el([86, 86]),
          fl(OCEAN, 100),
          st(INK, 5),
        ]),
        gr("inner", [el([56, 56]), st(WHITE, 4)]),
      ],
      {
        p: {
          a: 1,
          k: [
            {
              i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
              o: { x: [0.2, 0.2, 0.2], y: [0, 0, 0] },
              t: 0,
              s: [CX, y - 80, 0],
            },
            {
              i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
              o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
              t: 10 + delay * 4,
              s: [CX, y + 6, 0],
            },
            {
              i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
              o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
              t: 18 + delay * 4,
              s: [CX, y, 0],
            },
            {
              i: { x: [0.42, 0.42, 0.42], y: [1, 1, 1] },
              o: { x: [0.58, 0.58, 0.58], y: [0, 0, 0] },
              t: 50,
              s: [CX, y - 6, 0],
            },
            { t: OP, s: [CX, y, 0] },
          ],
        },
        o: fadeIn(delay * 4, 12 + delay * 4),
      },
    );
  return anim("pricing", [
    halo(),
    coin("c1", CY + 54, 1),
    coin("c2", CY + 10, 2),
    coin("c3", CY - 34, 3),
  ]);
}

function copyAnim() {
  const page = rc([150, 190], [0, 0], 10);
  const lines = [-40, -8, 24, 56].map((y, i) =>
    gr(`ln${i}`, [
      sh(
        [
          [-48, y],
          [i === 3 ? 12 : 48, y],
        ],
        false,
      ),
      st(OCEAN, 5),
      tm(12 + i * 8, 28 + i * 8),
    ]),
  );
  const pen = sh([
    [70, 70],
    [92, 48],
    [102, 58],
    [80, 80],
    [70, 86],
  ]);
  return anim("copy", [
    halo(),
    layer(
      "page",
      2,
      [
        gr("sheet", [page, fl(WHITE, 100), st(INK, 6), tm(0, 20)]),
        ...lines,
        gr("pen", [pen, fl(OCEAN, 100), st(INK, 3)]),
      ],
      { p: floatP(6) },
    ),
  ]);
}

function contactAnim() {
  const phone = rc([92, 168], [ -36, 0], 16);
  const screen = rc([72, 128], [-36, 4], 8);
  const bubble = sh([
    [18, -36],
    [118, -36],
    [118, 28],
    [48, 28],
    [28, 52],
    [40, 28],
    [18, 28],
  ]);
  const dots = [-12, 18, 48].map((x, i) =>
    gr(`d${i}`, [el([10, 10], [x + 50, -4]), fl(OCEAN, 100)]),
  );
  return anim("contact", [
    halo(),
    layer(
      "phone",
      2,
      [
        gr("ph", [phone, fl(WHITE, 100), st(INK, 6), tm(0, 22)]),
        gr("sc", [screen, fl(OCEAN, 22)]),
      ],
      { p: floatP(5) },
    ),
    layer(
      "bubble",
      3,
      [gr("b", [bubble, fl(WHITE, 100), st(INK, 5), ...dots])],
      {
        o: fadeIn(16, 30),
        s: {
          a: 1,
          k: [
            {
              i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] },
              o: { x: [0.2, 0.2, 0.2], y: [0, 0, 0] },
              t: 16,
              s: [70, 70, 100],
            },
            { t: 32, s: [100, 100, 100] },
          ],
        },
      },
    ),
  ]);
}

function reviewAnim() {
  const check = sh(
    [
      [-36, 8],
      [-8, 40],
      [48, -36],
    ],
    false,
  );
  const dots = [
    [-110, -80],
    [120, -60],
    [-100, 90],
    [110, 80],
    [0, -120],
  ].map(([x, y], i) =>
    layer(
      `spark${i}`,
      4 + i,
      [gr("s", [el([12, 12]), fl(OCEAN, 100)])],
      {
        p: { a: 0, k: [CX + x, CY + y, 0] },
        s: pulseScale(60, 140),
        o: fadeIn(20 + i * 4, 34 + i * 4),
      },
    ),
  );
  return anim("review", [
    halo(),
    layer(
      "mark",
      2,
      [
        gr("ring", [el([168, 168]), st(INK, 7), fl(WHITE, 100), tm(0, 22)]),
        gr("check", [check, st(OCEAN, 12), tm(16, 40)]),
      ],
      { p: floatP(6), s: pulseScale(97, 103) },
    ),
    ...dots,
  ]);
}

const files = {
  type: typeAnim(),
  location: locationAnim(),
  specs: specsAnim(),
  utilities: utilitiesAnim(),
  rules: rulesAnim(),
  photos: photosAnim(),
  pricing: pricingAnim(),
  copy: copyAnim(),
  contact: contactAnim(),
  review: reviewAnim(),
};

for (const [name, data] of Object.entries(files)) {
  const body = `const animation: object = ${JSON.stringify(data)};\nexport default animation;\n`;
  writeFileSync(join(DIR, `${name}.ts`), body);
  console.log("wrote", name, body.length);
}
