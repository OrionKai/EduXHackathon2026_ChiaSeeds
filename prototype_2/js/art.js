/* WorldQuest prototype_2 — original SVG artwork.
 * All illustrations are invented WorldQuest motifs (no museum artifact replicas,
 * no third-party assets). Decorative art is marked aria-hidden; meaning is always
 * duplicated in adjacent text.
 */
'use strict';

const Art = (() => {
  const INK = '#20264B';

  /* ----- brand logo: compass star in a rounded tile ----- */
  function logo(size = 40) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#6B5CE7"/>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <path d="M24 9 L27.4 20.6 L39 24 L27.4 27.4 L24 39 L20.6 27.4 L9 24 L20.6 20.6 Z" fill="#FFF9EE"/>
      <circle cx="24" cy="24" r="3.4" fill="#FFB547" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="35.5" cy="12.5" r="1.8" fill="#FFB547"/>
    </svg>`;
  }

  /* ----- the museum arch hero (fictional WorldQuest museum, not a real plan) ----- */
  function arch({ door = '#6B5CE7', face = '#FBD9A0', size = 220 } = {}) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 240 240" aria-hidden="true">
      <rect x="34" y="214" width="180" height="10" rx="5" fill="#CBC4F2"/>
      <g>
        <path d="M44 210 V96 a76 76 0 0 1 152 0 V210 Z" fill="${face}" stroke="${INK}" stroke-width="7"/>
        <path d="M74 210 V110 a46 46 0 0 1 92 0 V210 Z" fill="${door}" stroke="${INK}" stroke-width="7"/>
        <rect x="56" y="118" width="10" height="92" rx="4" fill="#F3E2C0" stroke="${INK}" stroke-width="4"/>
        <rect x="174" y="118" width="10" height="92" rx="4" fill="#F3E2C0" stroke="${INK}" stroke-width="4"/>
        <path d="M96 62 l5 9 M120 54 v10 M144 62 l-5 9" stroke="#FFF9EE" stroke-width="6" stroke-linecap="round"/>
      </g>
      <path d="M205 36 l3.2 8.8 8.8 3.2 -8.8 3.2 -3.2 8.8 -3.2 -8.8 -8.8 -3.2 8.8 -3.2 Z" fill="#FFB547"/>
      <circle cx="36" cy="58" r="4" fill="#F87587"/>
    </svg>`;
  }

  /* ----- sticker tag used beside the arch ----- */
  function sticker(text, icon = '💬') {
    return `<span class="arch-sticker" aria-hidden="true">${icon} ${text}</span>`;
  }

  /* ----- collectible illustrations (3:4) ----- */

  function frame(inner, bg1, bg2) {
    return `<svg viewBox="0 0 300 400" class="card-art-svg" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="g${bg1.replace(/#/g, '')}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
        </linearGradient>
      </defs>
      <rect width="300" height="400" fill="url(#g${bg1.replace(/#/g, '')})"/>
      <circle cx="150" cy="185" r="104" fill="#FFFFFF" opacity="0.35"/>
      <circle cx="150" cy="185" r="78" fill="#FFFFFF" opacity="0.5"/>
      ${stars('#FFFFFF')}
      ${inner}
    </svg>`;
  }

  function stars(color) {
    return `<g fill="${color}" opacity="0.85">
      <path d="M52 64 l2.6 7.4 7.4 2.6 -7.4 2.6 -2.6 7.4 -2.6 -7.4 -7.4 -2.6 7.4 -2.6 Z"/>
      <path d="M246 96 l2 5.6 5.6 2 -5.6 2 -2 5.6 -2 -5.6 -5.6 -2 5.6 -2 Z"/>
      <circle cx="236" cy="312" r="4"/>
      <circle cx="58" cy="330" r="3"/>
    </g>`;
  }

  const collectibleArt = {
    detail_lens: () =>
      frame(
        `<g stroke="${INK}" stroke-width="8" stroke-linecap="round">
          <circle cx="138" cy="168" r="62" fill="#EFEBFF"/>
          <circle cx="138" cy="168" r="62" fill="none"/>
          <circle cx="138" cy="168" r="40" fill="#FFFFFF" stroke-width="5"/>
          <path d="M120 156 a24 24 0 0 1 20 -10" stroke="#6B5CE7" stroke-width="6" fill="none"/>
          <path d="M184 214 l44 44" stroke-width="16"/>
          <path d="M184 214 l44 44" stroke="#FFB547" stroke-width="7"/>
        </g>
        <path d="M138 150 a20 20 0 0 1 0 36 a20 20 0 0 1 0 -36 Z M138 158 a10 10 0 1 0 0 20 a10 10 0 0 0 0 -20" fill="#6B5CE7" fill-rule="evenodd"/>
        <path d="M220 120 l3 8.4 8.4 3 -8.4 3 -3 8.4 -3 -8.4 -8.4 -3 8.4 -3 Z" fill="#FFB547" stroke="${INK}" stroke-width="3"/>`,
        '#DCD4FF', '#F3EFFF'
      ),

    memory_stone: () =>
      frame(
        `<g stroke="${INK}" stroke-width="7" stroke-linejoin="round">
          <path d="M106 260 C92 206 100 150 150 122 C200 150 208 206 194 260 Z" fill="#BFF2E8"/>
          <path d="M122 250 C114 208 122 166 150 146 C178 166 186 208 178 250 Z" fill="#FFFFFF" stroke-width="5"/>
        </g>
        <g stroke="#20BDA9" stroke-width="6" stroke-linecap="round" fill="none">
          <path d="M150 170 a18 18 0 0 1 0 34 a11 11 0 0 1 0 -22"/>
          <path d="M136 226 h28"/>
        </g>
        <circle cx="150" cy="118" r="7" fill="#FFB547" stroke="${INK}" stroke-width="3"/>`,
        '#C3EFE6', '#EAFBF6'
      ),

    twin_tokens: () =>
      frame(
        `<g stroke="${INK}" stroke-width="7">
          <circle cx="122" cy="168" r="54" fill="#FFD98E"/>
          <circle cx="122" cy="168" r="36" fill="none" stroke-width="5" stroke-dasharray="6 9"/>
          <circle cx="186" cy="214" r="54" fill="#FFF3D6"/>
          <circle cx="186" cy="214" r="36" fill="none" stroke-width="5"/>
        </g>
        <path d="M112 152 l10 32 M132 152 l-10 32" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
        <path d="M172 204 a16 16 0 0 1 28 0 a16 16 0 0 1 -28 20" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
        <path d="M228 116 l3 8.4 8.4 3 -8.4 3 -3 8.4 -3 -8.4 -8.4 -3 8.4 -3 Z" fill="#F87587" stroke="${INK}" stroke-width="3"/>`,
        '#FFE2A8', '#FFF6E0'
      ),

    listening_shell: () =>
      frame(
        `<g stroke="${INK}" stroke-width="7" stroke-linecap="round">
          <path d="M150 262 C106 262 84 230 84 196 C84 148 116 118 154 118 C196 118 216 148 216 184 C216 222 192 240 162 240 C136 240 122 222 122 200 C122 180 136 166 154 166 C170 166 180 176 180 192" fill="#FFD3D9" fill-rule="nonzero"/>
        </g>
        <g stroke="#F87587" stroke-width="6" stroke-linecap="round" fill="none">
          <path d="M236 160 a34 34 0 0 1 0 44"/>
          <path d="M252 148 a52 52 0 0 1 0 68"/>
        </g>
        <circle cx="70" cy="128" r="5" fill="#6B5CE7"/>`,
        '#FFD9D0', '#FFF0EB'
      ),

    curator_lantern: () =>
      frame(
        `<g stroke="${INK}" stroke-width="7" stroke-linejoin="round">
          <path d="M150 96 v18" stroke-linecap="round"/>
          <rect x="118" y="114" width="64" height="18" rx="8" fill="#CBC4F2"/>
          <path d="M122 132 L110 220 a40 18 0 0 0 80 0 L178 132 Z" fill="#EFEBFF"/>
          <path d="M126 150 h48" stroke-width="4" opacity="0.5"/>
          <rect x="132" y="236" width="36" height="16" rx="7" fill="#CBC4F2"/>
        </g>
        <circle cx="150" cy="184" r="24" fill="#FFB547" stroke="${INK}" stroke-width="5"/>
        <path d="M150 170 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill="#FFF9EE"/>
        <g stroke="#FFB547" stroke-width="5" stroke-linecap="round" opacity="0.9">
          <path d="M96 184 h-18 M204 184 h18 M118 140 l-13 -11 M182 140 l13 -11"/>
        </g>`,
        '#DDD5FA', '#F6F1FF'
      ),
  };

  function masterArt() {
    return `<svg viewBox="0 0 300 400" class="card-art-svg" aria-hidden="true">
      <defs>
        <radialGradient id="gm" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stop-color="#FFE9B8"/><stop offset="0.55" stop-color="#FFD98E"/><stop offset="1" stop-color="#F3B95C"/>
        </radialGradient>
      </defs>
      <rect width="300" height="400" fill="url(#gm)"/>
      <g stroke="#FFFFFF" stroke-width="4" opacity="0.65">
        <path d="M150 42 v-18 M150 358 v18 M42 200 h-18 M258 200 h18" stroke-linecap="round"/>
      </g>
      <circle cx="150" cy="196" r="116" fill="#FFFFFF" opacity="0.4"/>
      <path d="M74 300 V190 a76 76 0 0 1 152 0 V300 Z" fill="#20BDA9" stroke="${INK}" stroke-width="8"/>
      <path d="M96 300 V200 a54 54 0 0 1 108 0 V300 Z" fill="#20264B" stroke="${INK}" stroke-width="8"/>
      <path d="M150 208 l7 19 19 7 -19 7 -7 19 -7 -19 -19 -7 19 -7 Z" fill="#FFB547"/>
      <g stroke="${INK}" stroke-width="4">
        <circle cx="150" cy="120" r="15" fill="#EFEBFF"/>
        <circle cx="92" cy="156" r="12" fill="#BFF2E8"/>
        <circle cx="208" cy="156" r="12" fill="#FFD98E"/>
        <circle cx="86" cy="236" r="12" fill="#FFD3D9"/>
        <circle cx="214" cy="236" r="12" fill="#DDD5FA"/>
      </g>
      <g fill="#FFFFFF" opacity="0.9">
        <path d="M58 84 l3 8.4 8.4 3 -8.4 3 -3 8.4 -3 -8.4 -8.4 -3 8.4 -3 Z"/>
        <path d="M238 70 l2.4 6.6 6.6 2.4 -6.6 2.4 -2.4 6.6 -2.4 -6.6 -6.6 -2.4 6.6 -2.4 Z"/>
        <circle cx="250" cy="330" r="4"/><circle cx="52" cy="318" r="3"/>
      </g>
    </svg>`;
  }

  function lockedArt() {
    return `<svg viewBox="0 0 300 400" class="card-art-svg" aria-hidden="true">
      <rect width="300" height="400" fill="#ECECF2"/>
      <circle cx="150" cy="185" r="84" fill="#FFFFFF" opacity="0.6"/>
      <g stroke="#9AA0B8" stroke-width="8" fill="none">
        <rect x="110" y="170" width="80" height="66" rx="14" fill="#C9CCDC"/>
        <path d="M122 170 v-16 a28 28 0 0 1 56 0 v16"/>
      </g>
      <circle cx="150" cy="198" r="9" fill="#878DA8"/>
      <path d="M150 204 v14" stroke="#878DA8" stroke-width="7" stroke-linecap="round"/>
    </svg>`;
  }

  /* ----- small inline icons (stroke inherits currentColor) ----- */
  const paths = {
    lens: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21"/>',
    monument: '<path d="M5 20 h14 M7 20 V9 a5 5 0 0 1 10 0 v11 M12 20 v-7"/>',
    tokens: '<circle cx="9" cy="10" r="5.5"/><circle cx="15" cy="14" r="5.5"/>',
    voices: '<path d="M4 6 h12 v8 h-7 l-3 3 v-3 h-2 Z M19 10 h1 v8 h-9" stroke-linejoin="round"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 8 0 v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11 V8 a4 4 0 0 1 7.5 -1.8"/>',
    check: '<path d="M4.5 12.5 l5 5 L19.5 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5 V12 l3 2.5"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8 v5 M12 16.4 v.2"/>',
    sparkle: '<path d="M12 4 l1.8 6.2 L20 12 l-6.2 1.8 L12 20 l-1.8 -6.2 L4 12 l6.2 -1.8 Z" stroke-linejoin="round"/>',
    eye: '<path d="M3 12 c2.5 -4.5 6 -6.5 9 -6.5 s6.5 2 9 6.5 c-2.5 4.5 -6 6.5 -9 6.5 s-6.5 -2 -9 -6.5 Z"/><circle cx="12" cy="12" r="2.8"/>',
    map: '<path d="M4 7 l5 -2 6 2 5 -2 v12 l-5 2 -6 -2 -5 2 Z M9 5 v12 M15 7 v12"/>',
    team: '<circle cx="8.5" cy="9" r="3.2"/><circle cx="15.5" cy="9" r="3.2"/><path d="M3.5 19 c0.8 -3.4 2.8 -5 5 -5 s4.2 1.6 5 5 M13.6 14.4 c2 -0.1 4 1.4 4.9 4.6"/>',
    puzzle: '<path d="M9 4 h6 v3 a2 2 0 0 0 4 0 h1 v6 h-3 a2 2 0 0 0 0 4 v3 h-6 v-3 a2 2 0 0 0 -4 0 H4 v-6 h3 a2 2 0 0 0 0 -4 V4 Z" stroke-linejoin="round"/>',
    trophy: '<path d="M8 4 h8 v6 a4 4 0 0 1 -8 0 Z M8 6 H5 a3 3 0 0 0 3 4.5 M16 6 h3 a3 3 0 0 1 -3 4.5 M12 14 v3 M8.5 20 h7 M10 17 h4 v3 h-4 Z"/>',
    pencil: '<path d="M4 20 l1 -4 L16.5 4.5 a2.1 2.1 0 0 1 3 3 L8 19 Z M14.5 6.5 l3 3"/>',
    handshake: '<path d="M3 8 l4 -2 5 2 5 -2 4 2 v7 l-4 3 -5 -3 -5 3 -4 -3 Z M12 8 v7" stroke-linejoin="round"/>',
    book: '<path d="M4 5 a7 7 0 0 1 8 1 a7 7 0 0 1 8 -1 v13 a7 7 0 0 0 -8 1 a7 7 0 0 0 -8 -1 Z M12 6 v13"/>',
    leaf: '<path d="M5 19 C5 9 12 5 20 5 c0 9 -5 14 -13 14 M5 19 c3 -5 7 -8 10 -9"/>',
    arrow: '<path d="M5 12 h13 M13 6.5 L18.5 12 L13 17.5"/>',
    back: '<path d="M19 12 H6 M11 6.5 L5.5 12 L11 17.5"/>',
    plus: '<path d="M12 5 v14 M5 12 h14"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4 a2.5 2.5 0 1 1 3.6 2.6 c-0.9 0.5 -1.2 1 -1.2 2 M12 17 v.2"/>',
  };

  function icon(name, size = 20, cls = '') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="icon ${cls}" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`;
  }

  Object.assign(collectibleArt, {
    scroll: () => frame(`<g stroke="${INK}" stroke-width="7" stroke-linejoin="round">
        <rect x="102" y="120" width="96" height="150" fill="#FFF6E0"/>
        <rect x="88" y="104" width="124" height="26" rx="13" fill="#FFD98E"/>
        <rect x="88" y="260" width="124" height="26" rx="13" fill="#FFD98E"/></g>
      <path d="M122 158 h56 M122 180 h56 M122 202 h40 M122 224 h50" stroke="#C9963B" stroke-width="5" stroke-linecap="round"/>
      <path d="M226 118 l3 8.4 8.4 3 -8.4 3 -3 8.4 -3 -8.4 -8.4 -3 8.4 -3 Z" fill="#6B5CE7" stroke="${INK}" stroke-width="3"/>`, '#FFE9C2', '#FFF8EA'),
    key: () => frame(`<g stroke="${INK}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
        <circle cx="150" cy="140" r="38" fill="#BFF2E8"/>
        <circle cx="150" cy="140" r="14" fill="#FFFFFF" stroke-width="5"/>
        <path d="M150 178 v94 M150 236 h26 M150 260 h18" stroke-width="10"/></g>
      <path d="M150 182 v86" stroke="#20BDA9" stroke-width="4" stroke-linecap="round"/>
      <circle cx="226" cy="122" r="6" fill="#FFB547" stroke="${INK}" stroke-width="3"/>`, '#C3EFE6', '#EAFBF6'),
    medal: () => frame(`<g stroke="${INK}" stroke-width="7" stroke-linejoin="round">
        <path d="M116 96 l24 72 h20 l24 -72 Z" fill="#F87587"/>
        <circle cx="150" cy="212" r="56" fill="#FFD98E"/>
        <circle cx="150" cy="212" r="38" fill="#FFF3D6" stroke-width="5"/></g>
      <path d="M150 188 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 Z" fill="#FFB547" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`, '#FFD9D0', '#FFF0EB'),
  });
  const ART_NAMES = { detail_lens: 'Magnifying glass', memory_stone: 'Carved stone', twin_tokens: 'Two coins', listening_shell: 'Shell', curator_lantern: 'Lantern', scroll: 'Scroll', key: 'Key', medal: 'Medal' };
  const PHOTO_OK = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
  /* A card's picture: the teacher's own photo, the picture they chose, or one picked by the card's position. */
  const artKey = (c, i = 0) => { const keys = Object.keys(collectibleArt); return c && collectibleArt[c.art] ? c.art : c && collectibleArt[c.id] ? c.id : keys[Math.max(0, i) % keys.length]; };
  function cardArt(c, i = 0) {
    if (c && typeof c.image === 'string' && PHOTO_OK.test(c.image)) return `<img class="card-photo" src="${c.image}" alt="">`;
    return collectibleArt[artKey(c, i)]();
  }
  return { logo, arch, sticker, collectibleArt, ART_NAMES, artKey, cardArt, PHOTO_OK, masterArt, lockedArt, icon };
})();
