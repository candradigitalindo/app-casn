/**
 * Latar belakang login: PETA INDONESIA gaya hi-tech.
 * Siluet kepulauan diisi matriks titik (dot-matrix) bercahaya + kontur glow,
 * berkas "radar scan" yang menyapu peta, node kota dengan ping, dan garis data
 * yang mengalir antar pulau ke Jakarta — merepresentasikan seleksi online yang
 * terhubung di seluruh titik lokasi se-Indonesia.
 * Murni SVG + SMIL/CSS (tanpa JS runtime), static-export friendly, aria-hidden.
 */

// viewBox 1000 x 460. Siluet pulau-pulau utama (disederhanakan tapi proporsional
// barat→timur: Sumatra, Jawa, Kalimantan, Sulawesi, Maluku, Papua, Bali-NTT).
const INDONESIA_PATH = [
  // Sumatra
  "M70,55 C112,72 142,122 176,176 C206,220 236,262 250,298 C246,312 224,306 209,284 C174,234 138,184 108,140 C88,110 70,86 62,68 C61,60 66,52 70,55 Z",
  // Jawa
  "M246,330 C302,322 362,326 432,332 C462,335 480,341 470,351 C454,361 410,358 360,355 C310,352 270,350 248,346 C239,342 240,334 246,330 Z",
  // Kalimantan (Borneo)
  "M360,108 C422,92 502,98 548,134 C578,160 582,212 561,257 C540,298 489,312 433,301 C383,293 349,256 344,205 C341,164 339,127 360,108 Z",
  // Sulawesi (bentuk K khas)
  "M588,150 C602,151 606,170 601,189 C617,193 637,183 651,169 C666,160 679,169 670,186 C659,206 634,216 611,219 C619,246 634,271 649,300 C655,316 641,323 631,308 C615,285 602,256 595,229 C588,256 580,286 565,306 C556,317 544,309 549,293 C560,263 572,236 578,211 C560,206 545,196 540,179 C536,166 549,159 562,166 C573,172 581,181 589,191 C586,177 583,163 588,150 Z",
  // Papua
  "M780,200 C760,205 748,221 759,236 C771,249 791,246 801,236 C816,251 846,250 876,256 C916,263 951,281 951,306 C949,331 905,341 860,336 C815,331 785,316 770,296 C758,279 762,256 770,241 C758,239 748,226 752,213 C756,203 768,198 780,200 Z",
  // Maluku (gugusan kecil)
  "M716,206 C726,204 732,214 727,224 C720,234 708,230 706,220 C705,212 709,207 716,206 Z",
  "M742,250 C752,248 758,258 752,268 C745,278 733,274 731,264 C730,256 735,251 742,250 Z",
  "M724,286 C733,285 738,294 733,302 C727,311 716,307 715,298 C714,291 718,287 724,286 Z",
  // Bali & Nusa Tenggara (rantai selatan)
  "M488,370 C497,369 502,377 497,384 C490,392 480,388 479,380 C478,373 482,371 488,370 Z",
  "M524,375 C536,373 544,382 537,391 C529,400 515,395 514,385 C513,378 517,376 524,375 Z",
  "M566,380 C580,378 590,387 582,396 C573,405 558,400 557,390 C556,383 560,381 566,380 Z",
  "M612,384 C624,382 632,391 625,400 C617,409 603,404 602,394 C601,387 606,385 612,384 Z",
  "M656,388 C672,386 684,395 675,404 C665,413 648,407 647,396 C646,390 650,389 656,388 Z",
].join(" ");

// Node kota / titik lokasi tes (koordinat di atas siluet).
type Node = { x: number; y: number; hub?: boolean };
const NODES: Node[] = [
  { x: 92, y: 96, hub: true },    // Medan
  { x: 176, y: 205 },             // Padang
  { x: 233, y: 285 },             // Lampung
  { x: 272, y: 343, hub: true },  // Jakarta
  { x: 360, y: 350 },             // Semarang
  { x: 432, y: 345 },             // Surabaya
  { x: 470, y: 210, hub: true },  // Banjarmasin/Pontianak
  { x: 405, y: 150 },             // Samarinda
  { x: 600, y: 295, hub: true },  // Makassar
  { x: 640, y: 178 },             // Manado
  { x: 735, y: 258 },             // Ambon
  { x: 870, y: 300, hub: true },  // Jayapura
  { x: 800, y: 232 },             // Sorong
  { x: 492, y: 378 },             // Denpasar
  { x: 660, y: 398 },             // Kupang
];

const JAKARTA = { x: 272, y: 343 };
const LINK_TARGETS = [
  { x: 92, y: 96 },    // Medan
  { x: 470, y: 210 },  // Kalimantan
  { x: 600, y: 295 },  // Makassar
  { x: 870, y: 300 },  // Jayapura
  { x: 640, y: 178 },  // Manado
  { x: 492, y: 378 },  // Denpasar
];

function arcPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  return `M ${a.x} ${a.y} Q ${mx} ${my - dist * 0.24} ${b.x} ${b.y}`;
}

export function IndonesiaNetworkBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Gradien dasar */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_125%_at_15%_10%,#13315c_0%,#0b1f3a_45%,#060d1c_100%)]" />

      {/* Aurora / glow lembut */}
      <div className="login-anim absolute -left-[10%] top-[2%] h-[55vh] w-[55vh] rounded-full bg-sky-500/20 blur-3xl"
           style={{ animation: "login-aurora 14s ease-in-out infinite" }} />
      <div className="login-anim absolute right-[0%] bottom-[0%] h-[50vh] w-[50vh] rounded-full bg-indigo-500/20 blur-3xl"
           style={{ animation: "login-aurora 18s ease-in-out infinite reverse" }} />

      {/* Grid teknis halus */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125,211,252,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.5) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />

      {/* Peta Indonesia dot-matrix */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 460"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <clipPath id="indoClip">
            <path d={INDONESIA_PATH} />
          </clipPath>
          <pattern id="indoDots" width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.35" fill="#38bdf8" />
          </pattern>
          <radialGradient id="indoFill" cx="35%" cy="25%" r="85%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.06" />
          </radialGradient>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="linkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.05" />
            <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0" />
            <stop offset="50%" stopColor="#a5f3fc" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a5f3fc" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Isi siluet: warna lembut + matriks titik + berkas radar (semua di-clip) */}
        <g clipPath="url(#indoClip)">
          <rect x="0" y="0" width="1000" height="460" fill="url(#indoFill)" />
          <rect x="0" y="0" width="1000" height="460" fill="url(#indoDots)" opacity="0.65" />
          {/* Radar scan beam menyapu peta */}
          <rect
            x="0" y="0" width="90" height="460" fill="url(#scanGrad)"
            className="login-anim"
            style={{ animation: "login-scan 7s linear infinite" }}
          />
        </g>

        {/* Kontur peta bercahaya */}
        <path d={INDONESIA_PATH} stroke="#7dd3fc" strokeWidth="1.1" strokeOpacity="0.55"
              className="login-anim" style={{ animation: "login-flicker 5s ease-in-out infinite" }} />

        {/* Garis data + komet mengalir ke Jakarta */}
        {LINK_TARGETS.map((t, i) => {
          const d = arcPath(JAKARTA, t);
          return (
            <g key={`link-${i}`}>
              <path d={d} stroke="url(#linkGrad)" strokeWidth={1.3} className="login-anim"
                    strokeDasharray="5 9" style={{ animation: `login-line-flow ${7 + i}s linear infinite` }} />
              <circle r={2.6} fill="#bae6fd">
                <animateMotion dur={`${4.5 + i * 0.9}s`} begin={`${i * 0.7}s`} repeatCount="indefinite"
                  path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1"
                  dur={`${4.5 + i * 0.9}s`} begin={`${i * 0.7}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Node kota / titik lokasi tes */}
        {NODES.map((n, i) => (
          <g key={`node-${i}`}>
            {n.hub && (
              <>
                <circle cx={n.x} cy={n.y} r={15} fill="url(#nodeGlow)" />
                <circle cx={n.x} cy={n.y} r={4} fill="none" stroke="#7dd3fc" strokeWidth={1.4}>
                  <animate attributeName="r" values="4;17" dur="2.6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="2.6s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                </circle>
              </>
            )}
            <circle cx={n.x} cy={n.y} r={n.hub ? 3.6 : 2.1}
                    fill={n.hub ? "#e0f2fe" : "#7dd3fc"} opacity={n.hub ? 1 : 0.8} />
          </g>
        ))}
      </svg>

      {/* Vignette agar konten tetap terbaca */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#060d1c]/85 via-transparent to-[#060d1c]/30" />
    </div>
  );
}
