/* Sinyal yükleme sahnesi: kurs arabası yaya geçidinde anne ördekle yavrularına yol verir.
   Saf JS + SVG, requestAnimationFrame ile her kare hesaplanır (süspansiyon ve tabela yay fiziğiyle sallanır).
   window.sinyalYukleme(kap): kap içine sahneyi kurar; kap sayfadan çıkınca kendiliğinden durur.
   Hareket azaltılmışsa ördeklerin geçtiği an tek kare olarak çizilir. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var GEN = 360, YUK = 220, V0 = 92;                       // sahne, seyir hızı (px/sn)
  var T_FREN = 2.0, D_FREN = 1.3, T_KALK = 6.9, D_KALK = 1.2, DONGU = 11.0;
  var AX = 108, OL = 1.55, AY = 190 - 156 * OL;             // arabanın sol kenarı, ölçeği, üst kayması (teker altı y=190)
  var BURUN = AX + 74.5 * OL, GECIT = BURUN + 16;             // durunca geçidin sol kenarı
  var sayac = 0;

  var ss = function (u) { return u * u * (3 - 2 * u); };
  var kis = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  // hız ve alınan yol (bir döngü içinde): seyir, yumuşak fren, bekleme, yumuşak kalkış, seyir
  function hiz(t) {
    if (t < T_FREN) return V0;
    if (t < T_FREN + D_FREN) return V0 * (1 - ss((t - T_FREN) / D_FREN));
    if (t < T_KALK) return 0;
    if (t < T_KALK + D_KALK) return V0 * ss((t - T_KALK) / D_KALK);
    return V0;
  }
  var X_DUR = V0 * (T_FREN + D_FREN / 2);
  function yol(t) {
    if (t < T_FREN) return V0 * t;
    if (t < T_FREN + D_FREN) { var u = (t - T_FREN) / D_FREN; return V0 * T_FREN + V0 * D_FREN * (u - u * u * u + u * u * u * u / 2); }
    if (t < T_KALK) return X_DUR;
    if (t < T_KALK + D_KALK) { var w = (t - T_KALK) / D_KALK; return X_DUR + V0 * D_KALK * (w * w * w - w * w * w * w / 2); }
    return X_DUR + V0 * D_KALK / 2 + V0 * (t - T_KALK - D_KALK);
  }
  var X_TUR = yol(DONGU);

  function el(ad, at, ic) { var e = document.createElementNS(NS, ad); for (var k in at) e.setAttribute(k, at[k]); if (ic) e.innerHTML = ic; return e; }

  // ---- çizimler ----
  function tepeler() { var s = ''; for (var i = -3; i < 6; i++) { var x = i * 200; s += '<path d="M' + x + ' 138 C' + (x + 40) + ' 138 ' + (x + 60) + ' 104 ' + (x + 100) + ' 104 S' + (x + 160) + ' 138 ' + (x + 200) + ' 138 Z"/>'; } return s; }
  function tepeler2() { var s = ''; for (var i = -3; i < 6; i++) { var x = i * 240 - 60; s += '<path d="M' + x + ' 138 C' + (x + 60) + ' 138 ' + (x + 80) + ' 116 ' + (x + 130) + ' 116 S' + (x + 200) + ' 138 ' + (x + 240) + ' 138 Z"/>'; } return s; }
  function agaclar(u) {
    var s = '';
    for (var i = -4; i < 9; i++) {
      var x = i * 150;
      s += '<g data-sal="' + (i * 1.7) + '" data-ox="' + (x + 34) + '" data-oy="133"><rect x="' + (x + 32) + '" y="112" width="4" height="22" rx="1.5" fill="#8a6440"/><circle cx="' + (x + 34) + '" cy="106" r="15" fill="#5fae58"/><circle cx="' + (x + 27) + '" cy="101" r="8" fill="#7fc472"/><circle cx="' + (x + 41) + '" cy="110" r="7" fill="#4f9c4b"/></g>';
      s += '<g data-sal="' + (i * 2.3 + 1) + '" data-ox="' + (x + 96) + '" data-oy="133"><rect x="' + (x + 94.5) + '" y="120" width="3" height="14" fill="#8a6440"/><path d="M' + (x + 96) + ' 92 L' + (x + 108) + ' 114 H' + (x + 84) + ' Z M' + (x + 96) + ' 102 L' + (x + 110) + ' 124 H' + (x + 82) + ' Z" fill="#3f8f5a"/></g>';
      s += '<ellipse cx="' + (x + 128) + '" cy="131" rx="11" ry="6" fill="#6ab65f"/><ellipse cx="' + (x + 124) + '" cy="129" rx="5" ry="3" fill="#8bd07c"/>';
    }
    return s;
  }
  function cimler() { var s = ''; for (var i = -12; i < 20; i++) { var x = i * 48; s += '<path d="M' + (x + 6) + ' 212 q2 -9 4 0 q2 -7 4 0 M' + (x + 30) + ' 214 q2 -7 3 0 q3 -10 5 0" stroke="#6fb85e" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="' + (x + 20) + '" cy="210" r="1.8" fill="#fff"/><circle cx="' + (x + 20) + '" cy="210" r=".8" fill="#ffd23f"/>'; } return s; }
  function gecit() {
    var s = '';
    for (var y = 145; y <= 189; y += 8) s += '<rect x="0" y="' + y + '" width="32" height="4.6" rx="1" fill="#fff" opacity=".92"/>';
    // yaya geçidi levhası (karşı kaldırımda)
    s += '<rect x="44" y="96" width="3" height="42" rx="1" fill="#7b8590"/><rect x="36" y="82" width="19" height="19" rx="3" fill="#1f5fbf" stroke="#fff" stroke-width="1.4"/><path d="M45.5 85 L52 97.5 H39 Z" fill="#fff"/><circle cx="45.5" cy="89.5" r="1.3" fill="#1c2129"/><path d="M45.3 91 l-.6 3.4 m.6 -3.4 l1.8 2.2 m-1.8 -2.2 l-1.6 1.6 m1 1.8 l-1.4 1.8 m1.4 -1.8 l1.6 1.6" stroke="#1c2129" stroke-width=".9" stroke-linecap="round"/>';
    return s;
  }
  // ördek: önden (geçitten bize doğru yürürken) ve yandan (kaldırımda sağa yürürken) iki görünüm; ayaklar y=0
  function ordek(yavru) {
    var g = yavru, govde = g ? '#ffd23f' : '#ffffff', kenar = g ? '#f2b705' : '#dfe3e8', kanat = g ? '#f6c429' : '#eef1f4';
    var on = '<g class="yk-on"><g class="yk-yur">' +
      '<ellipse class="yk-ay1" cx="-2.6" cy="0" rx="2.2" ry="1" fill="#ff9f1c"/><ellipse class="yk-ay2" cx="2.6" cy="0" rx="2.2" ry="1" fill="#ff9f1c"/>' +
      '<ellipse cx="-6.4" cy="-9" rx="2.3" ry="4.6" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7" transform="rotate(14 -6.4 -9)"/><ellipse cx="6.4" cy="-9" rx="2.3" ry="4.6" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7" transform="rotate(-14 6.4 -9)"/>' +
      '<ellipse cx="0" cy="-8.6" rx="' + (g ? 6.2 : 7) + '" ry="' + (g ? 6.6 : 7.6) + '" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7"/>' +
      '<circle cx="0" cy="' + (g ? -18 : -19.4) + '" r="' + (g ? 5.6 : 5.2) + '" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7"/>' +
      (g ? '<path d="M-.6 -23.4 q.6 -2.4 1.6 -.4" stroke="' + kenar + '" stroke-width="1" fill="none"/>' : '<path d="M-3.4 -15.6 q3.4 2.2 6.8 0" stroke="#5b8def" stroke-width="1.6" fill="none" stroke-linecap="round"/>') +
      '<circle cx="-1.9" cy="' + (g ? -18.8 : -20.2) + '" r=".95" fill="#1c2129"/><circle cx="1.9" cy="' + (g ? -18.8 : -20.2) + '" r=".95" fill="#1c2129"/>' +
      '<ellipse cx="0" cy="' + (g ? -16.4 : -17.6) + '" rx="' + (g ? 2.2 : 2.6) + '" ry="1.3" fill="#ff9f1c"/>' +
      '</g></g>';
    var hy = g ? -15.5 : -17, hx = g ? 4.2 : 5.2, hr = g ? 5.2 : 4.8;
    var yan = '<g class="yk-yan" style="display:none"><g class="yk-ybac1"><path d="M-1.5 -3.5 V-.6" stroke="#f08c00" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="-.4" cy="0" rx="2.2" ry=".85" fill="#ff9f1c"/></g>' +
      '<g class="yk-ybac2"><path d="M1.8 -3.5 V-.6" stroke="#f08c00" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="2.9" cy="0" rx="2.2" ry=".85" fill="#ff9f1c"/></g>' +
      '<g class="yk-ygov"><path d="M-7.6 -9.4 L-11.4 -13 L-7 -6.6 Z" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7" stroke-linejoin="round"/>' +
      '<ellipse cx="0" cy="-8" rx="' + (g ? 7.2 : 8.4) + '" ry="' + (g ? 6 : 6.4) + '" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7"/>' +
      '<ellipse cx="-1.4" cy="-8.4" rx="' + (g ? 3.8 : 4.6) + '" ry="' + (g ? 2.6 : 3) + '" fill="' + kanat + '" stroke="' + kenar + '" stroke-width=".6"/>' +
      '<g class="yk-ybas"><circle cx="' + hx + '" cy="' + hy + '" r="' + hr + '" fill="' + govde + '" stroke="' + kenar + '" stroke-width=".7"/>' +
      (g ? '<path d="M' + (hx - .6) + ' ' + (hy - hr - .2) + ' q.8 -2.4 1.8 -.3" stroke="' + kenar + '" stroke-width="1" fill="none"/>' : '<path d="M' + (hx - 4) + ' ' + (hy + 3.6) + ' q3.4 1.8 6.6 -.4" stroke="#5b8def" stroke-width="1.6" fill="none" stroke-linecap="round"/>') +
      '<circle cx="' + (hx + 1.8) + '" cy="' + (hy - 1) + '" r=".95" fill="#1c2129"/>' +
      '<path d="M' + (hx + hr - .8) + ' ' + (hy + .2) + ' q3.4 .2 3.2 1.4 q-1.7 .8 -3.4 -.1 z" fill="#ff9f1c"/></g></g></g>';
    return '<ellipse class="yk-gol" cx="0" cy="1" rx="' + (g ? 5 : 8) + '" ry="1.6" fill="#000" opacity=".16"/>' + on + yan;
  }
  function araba(u) {
    return '<defs><linearGradient id="' + u + 'g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b7be0"/><stop offset=".55" stop-color="#0a4da2"/><stop offset="1" stop-color="#073d82"/></linearGradient>' +
      '<linearGradient id="' + u + 'c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef6ff"/><stop offset="1" stop-color="#b9d6f7"/></linearGradient></defs>' +
      // hatchback (Clio benzeri): kısa dik arka, uzun motor kaputu; araba sağa bakar
      '<path d="M4 146 V134 Q4 128 6.5 124 L12 115.5 Q14 112 19 112 H40 Q44 112 47 115 L56 126 L69 128.6 Q74.5 129.6 74.5 135 V146 Q74.5 148 72.5 148 H6 Q4 148 4 146 Z" fill="url(#' + u + 'g)"/>' +
      '<path d="M9 131 Q22 129 40 129 L68 130.4" stroke="#fff" stroke-opacity=".28" stroke-width="1.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M15.5 115 H29 V126 H10.5 Z M32 115 H40 Q42 115 43.6 116.6 L51.2 126 H32 Z" fill="url(#' + u + 'c)"/>' +
      '<path d="M17 124 L21 117 M20.5 125 L23.5 120 M35 124.5 L38.6 118" stroke="#fff" stroke-opacity=".8" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M30.5 128 V146" stroke="#06336d" stroke-width=".9"/><rect x="22" y="133" width="4.5" height="1.6" rx=".8" fill="#06336d"/><rect x="36" y="133" width="4.5" height="1.6" rx=".8" fill="#06336d"/>' +
      '<path d="M50.5 125.4 h4.6 q1 0 1 1.4 h-5.6 z" fill="#06336d"/><path d="M56 126.4 L69 129" stroke="#06336d" stroke-opacity=".35" stroke-width=".8"/>' +
      '<path d="M8 142 H70.5" stroke="#5d94dc" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
      '<ellipse class="yk-yanak" cx="64" cy="135.4" rx="2.8" ry="1.6" fill="#ff7aa2" opacity="0"/>' +
      '<g class="yk-goz"><ellipse cx="42" cy="120.5" rx="3.4" ry="3.9" fill="#fff"/><g class="yk-bebek"><circle cx="42.6" cy="121" r="1.8" fill="#1c2129"/><circle cx="43.2" cy="120.3" r=".55" fill="#fff"/></g></g>' +
      '<path class="yk-mutlu" d="M39 121.5 q3 -3 6 0" stroke="#1c2129" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0"/>' +
      '<path class="yk-gul" d="M66 139.4 q3 2.4 6 0" stroke="#e8f1ff" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<rect x="70.6" y="130.8" width="3.8" height="4.2" rx="1.6" fill="#ffe08a"/><rect x="4" y="129.6" width="2.8" height="5" rx="1" fill="#ff6b5b"/>';
  }
  function teker(cx) {
    return '<g class="yk-teker" data-cx="' + cx + '"><circle cx="' + cx + '" cy="148" r="8" fill="#1f242b"/><circle cx="' + cx + '" cy="148" r="4.6" fill="#cfd6df"/>' +
      '<path d="M' + cx + ' 143.6 V152.4 M' + (cx - 4.2) + ' 146.6 L' + (cx + 4.2) + ' 149.4 M' + (cx - 4.2) + ' 149.4 L' + (cx + 4.2) + ' 146.6" stroke="#8c96a3" stroke-width="1.1"/><circle cx="' + cx + '" cy="148" r="1.5" fill="#6b7480"/></g>';
  }
  var KALP = '<path d="M0 3 C-6 -2 -4 -8 0 -5 C4 -8 6 -2 0 3 Z" fill="#ff5c8a"/><path d="M-2.6 -4.4 q-1.2 .4 -1.2 1.8" stroke="#fff" stroke-opacity=".7" stroke-width=".9" fill="none" stroke-linecap="round"/>';

  function kur(kap) {
    var u = 'yk' + (++sayac) + Math.floor(Math.random() * 1e4);
    var svg = el('svg', { viewBox: '0 0 ' + GEN + ' ' + YUK, preserveAspectRatio: 'xMidYMax slice', class: 'yk', role: 'img', 'aria-label': 'Kurs arabası yaya geçidinde ördek ailesine yol veriyor' });
    svg.innerHTML =
      '<circle class="yk-gunes-isik" cx="252" cy="44" r="26" fill="#ffe7a3" opacity=".55"/><circle cx="252" cy="44" r="16" fill="#ffd166"/>' +
      '<g class="yk-bulut1" fill="#fff"><circle cx="60" cy="40" r="9"/><circle cx="72" cy="34" r="12"/><circle cx="86" cy="40" r="9"/><rect x="60" y="40" width="26" height="9"/><g transform="translate(600 0)"><circle cx="60" cy="40" r="9"/><circle cx="72" cy="34" r="12"/><circle cx="86" cy="40" r="9"/><rect x="60" y="40" width="26" height="9"/></g><g transform="translate(1200 0)"><circle cx="60" cy="40" r="9"/><circle cx="72" cy="34" r="12"/><circle cx="86" cy="40" r="9"/><rect x="60" y="40" width="26" height="9"/></g></g>' +
      '<g class="yk-bulut2" fill="#fff" opacity=".9"><circle cx="190" cy="62" r="6"/><circle cx="199" cy="58" r="8"/><circle cx="209" cy="62" r="6"/><rect x="190" y="62" width="19" height="6"/><g transform="translate(600 0)"><circle cx="190" cy="62" r="6"/><circle cx="199" cy="58" r="8"/><circle cx="209" cy="62" r="6"/><rect x="190" y="62" width="19" height="6"/></g><g transform="translate(1200 0)"><circle cx="190" cy="62" r="6"/><circle cx="199" cy="58" r="8"/><circle cx="209" cy="62" r="6"/><rect x="190" y="62" width="19" height="6"/></g></g>' +
      '<g class="yk-kuslar" stroke="#3a4a63" stroke-width="1.4" fill="none" stroke-linecap="round"><path class="yk-kus1" d="M-4 0 q2 -2.6 4 0 q2 -2.6 4 0"/><path class="yk-kus2" transform="translate(12 -6)" d="M-3 0 q1.5 -2 3 0 q1.5 -2 3 0"/></g>' +
      '<g class="yk-uzak2" fill="#cfe7c1">' + tepeler2() + '</g><g class="yk-uzak" fill="#b6dca6">' + tepeler() + '</g>' +
      '<g class="yk-orta">' + agaclar(u) + '</g>' +
      '<rect x="-700" y="133" width="1800" height="10" fill="#dfe3e8"/><path class="yk-derz1" d="M-700 138 H1100" stroke="#c7cdd5" stroke-width="10" stroke-dasharray="1.4 22.6"/><rect x="-700" y="141.5" width="1800" height="2" fill="#b9c0c9"/>' +
      '<rect x="-700" y="143" width="1800" height="53" fill="#3a4049"/><path class="yk-serit" d="M-700 170 H1100" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-dasharray="18 14"/>' +
      '<g class="yk-gecit">' + gecit() + '</g>' +
      '<g class="yk-arka-ordek"></g>' +
      '<g class="yk-hiz" stroke="#9db4d3" stroke-width="2.4" stroke-linecap="round"><path d="M' + (AX - 34) + ' 132 H' + (AX - 10) + '"/><path d="M' + (AX - 46) + ' 150 H' + (AX - 12) + '"/><path d="M' + (AX - 30) + ' 166 H' + (AX - 8) + '"/></g>' +
      '<g class="yk-duman"></g>' +
      '<ellipse cx="' + (AX + 38 * OL) + '" cy="191" rx="' + (33 * OL) + '" ry="3.4" fill="#000" opacity=".22"/>' +
      '<g class="yk-arac" transform="translate(' + AX + ' ' + AY + ') scale(' + OL + ')"><g class="yk-govde">' + araba(u) +
      '<g class="yk-tabela"><rect x="22.6" y="110.6" width="1.4" height="2.4" fill="#5b6470"/><rect x="30" y="110.6" width="1.4" height="2.4" fill="#5b6470"/><rect x="17" y="103" width="20" height="8.2" rx="2" fill="#f2b705" stroke="#c99600" stroke-width=".8"/><path d="M27 104.3 l2.5 2.8 -2.5 2.8 -2.5 -2.8z" fill="#1c2129"/></g>' +
      '</g>' + teker(17) + teker(59) + '</g>' +
      '<g class="yk-kalpler"><g class="yk-kalp1" opacity="0">' + KALP + '</g><g class="yk-kalp2" opacity="0">' + KALP + '</g></g>' +
      '<rect x="-700" y="196" width="1800" height="9" fill="#e6e9ed"/><rect x="-700" y="196" width="1800" height="1.6" fill="#c3c9d1"/><path class="yk-derz2" d="M-700 200.5 H1100" stroke="#cfd5dc" stroke-width="9" stroke-dasharray="1.4 26.6"/>' +
      '<rect x="-700" y="205" width="1800" height="15" fill="#a5d88f"/><g class="yk-cim">' + cimler() + '</g>' +
      '<g class="yk-on-ordek"></g>';
    kap.innerHTML = ''; kap.appendChild(svg);
    var boyutla = function () { var w = kap.clientWidth, h = kap.clientHeight; if (!w || !h) return; var vw = Math.max(200, Math.min(1400, YUK * w / h)); svg.setAttribute('viewBox', (186 - vw / 2).toFixed(1) + ' 0 ' + vw.toFixed(1) + ' ' + YUK); };
    boyutla(); if (window.ResizeObserver) new ResizeObserver(boyutla).observe(kap); else addEventListener('resize', boyutla);
    var q = function (s) { return svg.querySelector(s); };
    var R = {
      uzak: q('.yk-uzak'), uzak2: q('.yk-uzak2'), orta: q('.yk-orta'), serit: q('.yk-serit'), derz1: q('.yk-derz1'), derz2: q('.yk-derz2'), cim: q('.yk-cim'),
      gecit: q('.yk-gecit'), arka: q('.yk-arka-ordek'), on: q('.yk-on-ordek'), govde: q('.yk-govde'), tabela: q('.yk-tabela'), tekerler: svg.querySelectorAll('.yk-teker'),
      goz: q('.yk-goz'), bebek: q('.yk-bebek'), mutlu: q('.yk-mutlu'), yanak: q('.yk-yanak'), gul: q('.yk-gul'), hiz: q('.yk-hiz'), duman: q('.yk-duman'),
      kalp1: q('.yk-kalp1'), kalp2: q('.yk-kalp2'), bulut1: q('.yk-bulut1'), bulut2: q('.yk-bulut2'), kuslar: q('.yk-kuslar'), kus1: q('.yk-kus1'), kus2: q('.yk-kus2'),
      gunes: q('.yk-gunes-isik'), salanlar: svg.querySelectorAll('[data-sal]')
    };
    // ördekler: anne + üç yavru; her biri sırayla geçer, sonuncusu biraz geride kalır
    var ORD = [{ y: 0, bas: 3.3, hiz: 40, olc: 1.3 }, { y: 1, bas: 3.62, hiz: 37, olc: .82 }, { y: 1, bas: 3.95, hiz: 38, olc: .82 }, { y: 1, bas: 4.2, hiz: 40, olc: .78 }];
    ORD.forEach(function (o, i) { o.g = el('g', {}, ordek(o.y)); o.on = o.g.querySelector('.yk-on'); o.yan = o.g.querySelector('.yk-yan'); o.yur = o.g.querySelector('.yk-yur'); o.ay1 = o.g.querySelector('.yk-ay1'); o.ay2 = o.g.querySelector('.yk-ay2'); o.ygov = o.g.querySelector('.yk-ygov'); o.ybas = o.g.querySelector('.yk-ybas'); o.ybac1 = o.g.querySelector('.yk-ybac1'); o.ybac2 = o.g.querySelector('.yk-ybac2'); o.i = i; o.gorunum = null; R.arka.appendChild(o.g); o.onde = false; });
    // egzoz dumanı havuzu
    var DUM = []; for (var d = 0; d < 16; d++) { var c = el('circle', { r: 0, fill: '#dde3ea', opacity: 0 }); R.duman.appendChild(c); DUM.push({ c: c, omur: 0 }); }
    var dumSon = 0;
    // yay fiziği: gövde eğimi (fren burnu indirir, kalkış kaldırır) ve tabela
    var th = 0, thv = 0, fi = 0, fiv = 0, oncekiV = V0, kirpSon = 0, kirpBas = -1, sonZ = null;
    var basla = window.__ykBas || null, t0 = 1.0;  // bütün sahneler aynı saati paylaşır: açılıştan bekleme ekranına geçişte kaldığı yerden sürer

    function ordekKonum(o, t, zx) {
      var bekX = zx + 16 - 11 * o.i - (o.i ? 3 : 0), hedefX = zx + 16 + (o.i % 2 ? -3 : 3), yatay = hedefX - bekX, dikey = 63;
      var gecen = Math.max(0, t - o.bas) * o.hiz, son;
      if (t <= o.bas) return { x: bekX, y: 140, gor: 'yan', yol: 0, yur: 0, p: 0 };
      if (gecen < yatay) return { x: bekX + gecen, y: 140, gor: 'yan', yol: gecen, yur: 1, p: gecen / (yatay + dikey) };
      if (gecen < yatay + dikey) return { x: hedefX, y: 140 + (gecen - yatay), gor: 'on', yol: gecen, yur: 1, p: gecen / (yatay + dikey) };
      son = t - o.bas - (yatay + dikey) / o.hiz;
      var ileri = Math.min(64, son * 18);
      return { x: hedefX + ileri, y: 203, gor: 'yan', yol: yatay + dikey + ileri, yur: ileri < 64 ? 1 : 0, p: 1 };
    }

    function kare(simdi) {
      if (!svg.isConnected) return;
      if (svg.__dur) { requestAnimationFrame(kare); return; }
      if (kap.offsetParent === null && !kap.closest('[data-yk-goster]')) { setTimeout(function () { requestAnimationFrame(kare); }, 400); return; }
      if (basla === null) basla = window.__ykBas = simdi;
      var ge = (simdi - basla) / 1000 + t0, tur = Math.floor(ge / DONGU), t = ge - tur * DONGU;
      var dt = sonZ === null ? 1 / 60 : Math.min(.05, (simdi - sonZ) / 1000); sonZ = simdi;
      ciz(t, tur, ge, dt);
      requestAnimationFrame(kare);
    }

    function ciz(t, tur, ge, dt) {
      var v = hiz(t), W = tur * X_TUR + yol(t), a = (v - oncekiV) / Math.max(dt, 1e-3); oncekiV = v;
      // katmanlar
      R.uzak2.setAttribute('transform', 'translate(' + (-(W * .07 % 240)) + ' 0)');
      R.uzak.setAttribute('transform', 'translate(' + (-(W * .16 % 200)) + ' 0)');
      R.orta.setAttribute('transform', 'translate(' + (-(W * .5 % 150)) + ' 0)');
      R.serit.setAttribute('stroke-dashoffset', W); R.derz1.setAttribute('stroke-dashoffset', W); R.derz2.setAttribute('stroke-dashoffset', W * 1.1);
      R.cim.setAttribute('transform', 'translate(' + (-(W * 1.25 % 48)) + ' 0)');
      R.bulut1.setAttribute('transform', 'translate(' + (900 - ((ge * 4 + W * .02) % 1800)) + ' 0)');
      R.bulut2.setAttribute('transform', 'translate(' + (700 - ((ge * 6 + W * .03) % 1800)) + ' 0)');
      R.gunes.setAttribute('r', 24 + Math.sin(ge * 1.6) * 2.5);
      var kx = (ge * 22) % 1500 - 600, ky = 52 + Math.sin(ge * .9) * 6, kan = Math.sin(ge * 14);
      R.kuslar.setAttribute('transform', 'translate(' + kx + ' ' + ky + ')');
      R.kus1.setAttribute('transform', 'scale(1 ' + (kan * .9) + ')'); R.kus2.setAttribute('transform', 'translate(12 -6) scale(1 ' + (Math.sin(ge * 14 + 1.4) * .9) + ')');
      for (var s = 0; s < R.salanlar.length; s++) { var g = R.salanlar[s]; g.setAttribute('transform', 'rotate(' + (Math.sin(ge * 1.3 + +g.dataset.sal) * 1.8) + ' ' + g.dataset.ox + ' ' + g.dataset.oy + ')'); }
      // geçit ve ördekler
      var zx = GECIT + (X_DUR - yol(t));
      var sinir = kis(Math.min(t / .45, (DONGU - t) / .45), 0, 1);
      R.gecit.setAttribute('transform', 'translate(' + zx + ' 0)'); R.gecit.setAttribute('opacity', sinir); R.arka.setAttribute('opacity', sinir); R.on.setAttribute('opacity', sinir);
      var hedef = null;
      ORD.forEach(function (o) {
        var k = ordekKonum(o, t, zx), olc = o.olc * (.86 + .26 * (k.y - 140) / 63);
        var adimBoy = o.y ? 4.2 : 5.6, faz = k.yol / adimBoy * Math.PI, sn = Math.sin(faz), zip = k.yur ? Math.abs(sn) * 1.1 : 0;
        if (k.gor !== o.gorunum) { o.on.style.display = k.gor === 'on' ? '' : 'none'; o.yan.style.display = k.gor === 'yan' ? '' : 'none'; o.gorunum = k.gor; }
        o.g.setAttribute('transform', 'translate(' + k.x + ' ' + (k.y - zip) + ') scale(' + olc + ')');
        if (k.gor === 'on') {
          o.yur.setAttribute('transform', 'rotate(' + (k.yur ? sn * 7 : 0) + ')');
          o.ay1.setAttribute('transform', 'translate(0 ' + (k.yur && sn > 0 ? -1.3 * sn : 0) + ')'); o.ay2.setAttribute('transform', 'translate(0 ' + (k.yur && sn < 0 ? 1.3 * sn : 0) + ')');
        } else {
          var bekle = !k.yur, nefes = bekle ? Math.sin(ge * 2.2 + o.i * 1.3) : 0, gaga = bekle && Math.sin(ge * .9 + o.i * 2) > .93 ? 1.6 : 0;
          o.ygov.setAttribute('transform', 'rotate(' + (k.yur ? sn * 4 : nefes * 1.2) + ')');
          o.ybas.setAttribute('transform', 'translate(' + (k.yur ? Math.abs(sn) * .9 : 0) + ' ' + (gaga + (k.yur ? 0 : nefes * .3)) + ')');
          o.ybac1.setAttribute('transform', 'translate(' + (k.yur ? sn * 1.8 : 0) + ' ' + (k.yur && sn > 0 ? -1 * sn : 0) + ')'); o.ybac2.setAttribute('transform', 'translate(' + (k.yur ? -sn * 1.8 : 0) + ' ' + (k.yur && sn < 0 ? sn : 0) + ')');
        }
        var onde = k.y > 166; if (onde !== o.onde) { (onde ? R.on : R.arka).appendChild(o.g); o.onde = onde; }
        if (!hedef && k.p > 0 && k.p < 1) hedef = k;
        if (!hedef && k.p === 0 && t > T_FREN) hedef = k;
      });
      // gövde ve tabela yayları (fren: burun iner; kalkış: burun kalkar)
      thv += (-90 * th - 8.5 * thv + 2.6 * (-a)) * dt; th += thv * dt;
      fiv += (-210 * fi - 4.6 * fiv + 26 * (-a) - 60 * thv * .02) * dt; fi += fiv * dt;
      var crouch = t > T_KALK - .32 && t < T_KALK ? Math.sin((t - (T_KALK - .32)) / .32 * Math.PI / 2) : 0;
      var bob = v > 1 ? Math.sin(W * .09) * .45 : Math.sin(ge * 42) * .22;
      R.govde.setAttribute('transform', 'rotate(' + kis(th, -6, 6) + ' 38 148) translate(0 ' + (bob + crouch * .9) + ')' + (crouch ? ' scale(1 ' + (1 - crouch * .035) + ')' : ''));
      R.tabela.setAttribute('transform', 'rotate(' + kis(fi, -22, 22) + ' 27 112)');
      var don = (W / (8 * OL)) * 180 / Math.PI;
      for (var w = 0; w < R.tekerler.length; w++) { var tk = R.tekerler[w]; tk.setAttribute('transform', 'rotate(' + (don % 360) + ' ' + tk.dataset.cx + ' 148)'); }
      // göz: ördekleri izler, ara sıra kırpar; kalp anında gülümser
      var mutluMu = t > 5.0 && t < 6.6;
      if (hedef && !mutluMu) { var ex = AX + 42 * OL, ey = AY + 120.5 * OL, dx = hedef.x - ex, dy = (hedef.y - 12) - ey, n = Math.hypot(dx, dy) || 1; R.bebek.setAttribute('transform', 'translate(' + (dx / n * 1.4) + ' ' + (dy / n * 1.6) + ')'); }
      else R.bebek.setAttribute('transform', 'translate(.6 0)');
      if (ge - kirpSon > 2.6 + (tur % 3) * .7) { kirpBas = ge; kirpSon = ge; }
      var kirp = ge - kirpBas < .16 ? Math.sin((ge - kirpBas) / .16 * Math.PI) : 0;
      R.goz.setAttribute('transform', 'translate(0 ' + (120.5 * kirp * .88) + ') scale(1 ' + (1 - kirp * .88) + ')');
      R.goz.setAttribute('opacity', mutluMu ? 0 : 1); R.mutlu.setAttribute('opacity', mutluMu ? 1 : 0);
      R.yanak.setAttribute('opacity', mutluMu ? .65 : 0);
      R.gul.setAttribute('d', mutluMu ? 'M65.4 138.8 q3.4 3.4 6.8 0' : 'M66 139.4 q3 2.4 6 0');
      // kalpler
      [[R.kalp1, 5.0, -4, 1.7], [R.kalp2, 5.35, 18, 1.2]].forEach(function (k) {
        var p = (t - k[1]) / 1.5;
        if (p < 0 || p > 1) { k[0].setAttribute('opacity', 0); return; }
        var pop = p < .2 ? 1.18 * Math.sin(p / .2 * Math.PI / 2) : 1 + .18 * Math.cos((p - .2) * 14) * Math.exp(-(p - .2) * 6);
        k[0].setAttribute('opacity', p > .7 ? (1 - p) / .3 : 1);
        k[0].setAttribute('transform', 'translate(' + (AX + 27 * OL + k[2] + Math.sin(p * 9) * 2) + ' ' + (AY + 96 * OL - p * 38) + ') scale(' + (pop * k[3]) + ')');
      });
      // hız çizgileri
      var hz = kis((v / V0 - .55) / .45, 0, 1);
      R.hiz.setAttribute('opacity', hz * .85); R.hiz.setAttribute('transform', 'translate(' + (Math.sin(ge * 30) * 2) + ' 0)');
      // egzoz: kalkışta yoğun, rölantide küçük puflar
      var kalkis = a > 15, rolanti = v < 1;
      if ((kalkis && ge - dumSon > .06) || (rolanti && ge - dumSon > .55)) {
        dumSon = ge; for (var p2 = 0; p2 < DUM.length; p2++) { if (DUM[p2].omur <= 0) { var D = DUM[p2]; D.omur = 1; D.x = AX + 2 * OL; D.y = AY + 143 * OL; D.vx = -(kalkis ? 26 : 8); D.vy = -(kalkis ? 12 : 6); D.rmax = kalkis ? 9 : 4.5; D.sure = kalkis ? .9 : .75; break; } }
      }
      for (var p3 = 0; p3 < DUM.length; p3++) {
        var Dm = DUM[p3]; if (Dm.omur <= 0) { Dm.c.setAttribute('opacity', 0); continue; }
        Dm.omur -= dt / Dm.sure; Dm.x += (Dm.vx - v) * dt; Dm.y += Dm.vy * dt;
        var yas = 1 - Dm.omur; Dm.c.setAttribute('cx', Dm.x); Dm.c.setAttribute('cy', Dm.y); Dm.c.setAttribute('r', 2 + yas * Dm.rmax); Dm.c.setAttribute('opacity', Math.max(0, Dm.omur) * .8);
      }
    }

    // inceleme için: sahneyi durdurup belirli bir ana (saniye) kadar adım adım ilerletir
    svg.__git = function (T) { svg.__dur = true; for (var x = 0; x <= T; x += 1 / 60) ciz(x % DONGU, Math.floor(x / DONGU), x, 1 / 60); };
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { oncekiV = 0; ciz(5.6, 0, 5.6, 1 / 60); return; }
    requestAnimationFrame(kare);
  }

  window.sinyalYukleme = kur;
  var ilk = function () { var l = document.querySelectorAll('[data-yk]'); for (var i = 0; i < l.length; i++) if (!l[i].firstChild) kur(l[i]); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ilk); else ilk();
})();
