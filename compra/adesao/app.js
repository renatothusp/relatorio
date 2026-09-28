/* =====================================================================
   Painel Executivo — Adesão a Compras USP
   ===================================================================== */
(function () {
"use strict";

var RAW = (typeof window.DADOS !== "undefined") ? window.DADOS : [];
if (!RAW.length) {
  document.body.insertAdjacentHTML("afterbegin",
    '<div style="padding:40px;text-align:center;color:#ff9aa8;font-family:sans-serif">' +
    'Não foi possível carregar <code>dados.json</code>. Execute um servidor local ' +
    '(ex.: <code>python -m http.server</code>) e abra <code>index.html</code>.</div>');
  return;
}

/* ---------------- utils ---------------- */
var MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
var MESES_L = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function brl(n){ return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
function brlShort(n){
  var a = Math.abs(n);
  if (a >= 1e9) return "R$ " + (n/1e9).toLocaleString("pt-BR",{maximumFractionDigits:2}) + " bi";
  if (a >= 1e6) return "R$ " + (n/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1}) + " mi";
  if (a >= 1e3) return "R$ " + (n/1e3).toLocaleString("pt-BR",{maximumFractionDigits:0}) + " mil";
  return brl(n);
}
function brlAxis(n){
  var a = Math.abs(n);
  if (a >= 1e6) return (n/1e6).toLocaleString("pt-BR",{maximumFractionDigits:0}) + "mi";
  if (a >= 1e3) return (n/1e3).toLocaleString("pt-BR",{maximumFractionDigits:0}) + "k";
  return String(Math.round(n));
}
function int(n){ return Math.round(n).toLocaleString("pt-BR"); }
function pad(n){ return n < 10 ? "0"+n : ""+n; }
function parseBr(s){
  if (!s) return null;
  var p = String(s).split("/");
  if (p.length < 3) return null;
  var d = new Date(+p[2], +p[1]-1, +p[0]);
  return isNaN(d) ? null : d;
}
function dataLong(d){ return d ? d.getDate() + " de " + MESES_L[d.getMonth()] + " de " + d.getFullYear() : "—"; }
function dataCurta(d){ return d ? pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear() : "—"; }
function media(a){ return a.length ? a.reduce(function(x,y){return x+y;},0)/a.length : 0; }
function mediana(a){
  if (!a.length) return 0;
  var s = a.slice().sort(function(x,y){return x-y;}), m = s.length>>1;
  return s.length % 2 ? s[m] : (s[m-1]+s[m])/2;
}
function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function norm(s){
  return String(s||"").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .replace(/\s+/g," ").trim();
}
function titleCase(s){
  return String(s||"").toLowerCase().replace(/(^|[\s\-/(])\p{L}/gu, function (m) {
    return m.toUpperCase();
  });
}


/* ---------------- normalização ---------------- */
function familia(g){
  g = norm(g);
  if (/vigilancia/.test(g)) return "Vigilância e Segurança";
  if (/limpeza|higiene|saneante|inseticida|desodoriz|compostos e preparados|utencilios de limpeza/.test(g)) return "Limpeza e Higiene";
  if (/alimentacao|alimentos|cafes|massas|acucares|vales|confeitarias|panific/.test(g)) return "Alimentação";
  if (/condicionamento de ar|refrigeracao|ventilacao|gases/.test(g)) return "Climatização e Gases";
  if (/computador|informatica|software|impressora|cabos|cabead|dados|edicao|projecao|audio|transmissao|fibra|equipamentos de som|entrada de dados/.test(g)) return "Tecnologia da Informação";
  if (/condutores|disjuntores|quadro de distribuicao|chaves eletricas|interruptores|lampadas|suprimentos para conducao|estabilizacao|protecao|iluminacao|sinalizacao|alarme|acessorios de equipamentos eletricos|baterias|quadro/.test(g)) return "Elétrica e Eletrônica";
  if (/transporte|locacao|gases|embarque|alfandegario/.test(g)) return "Serviços Gerais e Logística";
  if (/hospitalar|medico|gases med|equipamentos medico/.test(g)) return "Área Hospitalar";
  if (/uniforme|vestuario|policia militar|policia civil/.test(g)) return "Uniformes e Vestuário";
  if (/didatic|ensino|educacao|merulho|ginastica|escolar|auditorio/.test(g)) return "Educação e Cultura";
  if (/computadores/.test(g)) return "Tecnologia da Informação";
  return "Outros";
}

var PAL = {
  "Vigilância e Segurança":"#2f7df6",
  "Tecnologia da Informação":"#35e0d0",
  "Elétrica e Eletrônica":"#9b6bff",
  "Limpeza e Higiene":"#37d399",
  "Equipamentos e Materiais":"#ffc24b",
  "Climatização e Gases":"#ff8f6b",
  "Alimentação":"#ff6b81",
  "Serviços Gerais e Logística":"#5ad2f4",
  "Área Hospitalar":"#b0f06a",
  "Uniformes e Vestuário":"#f78ae0",
  "Educação e Cultura":"#8fa7c9",
  "Outros":"#6f7d9c"
};

var rows = RAW.map(function (r, i) {
  var dCad = parseBr(r.dataCadastro);
  var dEmp = parseBr(r.dataEmpenho);
  var val = parseFloat(r.valorEmpenhado) || 0;
  return {
    i: i,
    cod: String(r.codCompra),
    dCad: dCad, dEmp: dEmp,
    dCadTxt: r.dataCadastro, dEmpTxt: r.dataEmpenho,
    ano: dCad ? dCad.getFullYear() : 0,
    anoEmp: dEmp ? dEmp.getFullYear() : 0,
    codGer: String(r.codUnidadeGerenciadora),
    siglaGer: r.siglaUnidadeGerenciadora,
    nomeGer: r.nomeUnidadeGerenciadora,
    codAd: String(r.codUnidadeAderida),
    siglaAd: r.siglaUnidadeAderida,
    nomeAd: r.nomeUnidadeAderida,
    grupo: r.grupoObj || "—",
    fam: familia(r.grupoObj),
    objeto: r.objeto || "—",
    val: val,
    valor: val,
    dias: (dCad && dEmp) ? Math.round((dEmp - dCad) / 86400000) : null
  };
});
/* campos derivados para a visão por item */
rows.forEach(function (r) {
  r.aderentes = 1;
  r.participantes = 1;
  r.gruposDistintos = 1;
});

/* ---------------- agregação por demanda ---------------- */
var byCod = {};
rows.forEach(function (r) {
  var d = byCod[r.cod];
  if (!d) {
    d = byCod[r.cod] = {
      cod: r.cod, dCad: r.dCad, dEmp: r.dEmp,
      dCadTxt: r.dCadTxt, dEmpTxt: r.dEmpTxt,
      ano: r.ano, anoEmp: r.anoEmp,
      siglaGer: r.siglaGer, nomeGer: r.nomeGer, codGer: r.codGer,
      grupo: r.grupo, fam: r.fam, objeto: r.objeto,
      dias: r.dias, itens: [], unidades: {}, valor: 0, grupos: {}
    };
  }
  d.itens.push(r);
  d.valor += r.val;
  d.unidades[r.codAd] = { sigla: r.siglaAd, nome: r.nomeAd, cod: r.codAd, val: 0 };
  d.unidades[r.codAd].val += r.val;
  d.grupos[r.grupo] = (d.grupos[r.grupo] || 0) + 1;
  if ((r.val > (d.maxVal || 0))) { d.maxVal = r.val; d.objeto = r.objeto; }
});
var demandas = Object.keys(byCod).map(function (k) {
  var d = byCod[k];
  d.aderentes = Object.keys(d.unidades).filter(function (c) { return c !== d.codGer; }).length;
  d.participantes = Object.keys(d.unidades).length;
  d.gruposDistintos = Object.keys(d.grupos).length;
  d.maiorUnidade = Object.keys(d.unidades).map(function (c) { return d.unidades[c]; })
    .sort(function (a,b) { return b.val - a.val; })[0];
  return d;
}).sort(function (a,b) { return a.dCad - b.dCad; });

/* ---------------- agregados globais ---------------- */
var totalValor = rows.reduce(function (s,r) { return s + r.val; }, 0);
var unidadesGer = {}, unidadesAd = {}, unidadeVal = {};
rows.forEach(function (r) {
  unidadesGer[r.siglaGer] = { sigla: r.siglaGer, nome: r.nomeGer, cod: r.codGer, demandas: {}, val: 0, itens: 0 };
  var a = unidadesAd[r.siglaAd] || (unidadesAd[r.siglaAd] = { sigla: r.siglaAd, nome: r.nomeAd, cod: r.codAd, demandas: {}, val: 0, itens: 0 });
  a.val += r.val; a.itens++;
  unidadeVal[r.siglaAd] = (unidadeVal[r.siglaAd] || 0) + r.val;
});
Object.keys(unidadesGer).forEach(function (s) {
  var g = unidadesGer[s];
  rows.forEach(function (r) { if (r.siglaGer === s) g.demandas[r.cod] = 1; });
  g.nDem = Object.keys(g.demandas).length;
});
Object.keys(unidadesAd).forEach(function (s) {
  var a = unidadesAd[s];
  rows.forEach(function (r) { if (r.siglaAd === s) a.demandas[r.cod] = 1; });
  a.nDem = Object.keys(a.demandas).length;
});
var totalParticipantes = Object.keys(unidadesGer).length + Object.keys(unidadesAd).length;
var totalItens = rows.length;

/* Demandas por ano */
var porAno = {};
demandas.forEach(function (d) {
  var a = porAno[d.ano] || (porAno[d.ano] = { ano: d.ano, n: 0, valor: 0, itens: 0, unidades: {} });
  a.n++; a.valor += d.valor; a.itens += d.itens.length;
  Object.keys(d.unidades).forEach(function (c) { a.unidades[c] = 1; });
});
var anos = Object.keys(porAno).map(Number).sort(function (a,b) { return a-b; });
anos.forEach(function (a) { porAno[a].nUn = Object.keys(porAno[a].unidades).length; });
var anoAtual = anos[anos.length - 1];
var anoAnterior = anos[anos.length - 2];

/* ---------------- tooltip ---------------- */
var tip = document.getElementById("tip");
function showTip(e, html) {
  tip.innerHTML = html; tip.classList.add("on"); tip.setAttribute("aria-hidden","false");
  moveTip(e);
}
function moveTip(e) {
  var r = tip.getBoundingClientRect();
  var x = e.clientX + 16, y = e.clientY - r.height - 12;
  if (x + r.width > innerWidth - 10) x = e.clientX - r.width - 16;
  if (y < 8) y = e.clientY + 18;
  tip.style.left = Math.max(8,x) + "px"; tip.style.top = y + "px";
}
function hideTip() { tip.classList.remove("on"); tip.setAttribute("aria-hidden","true"); }
function bindTip(el, htmlFn) {
  el.addEventListener("mouseenter", function (e) { showTip(e, htmlFn()); });
  el.addEventListener("mousemove", moveTip);
  el.addEventListener("mouseleave", hideTip);
}

/* =====================================================================
   HERO — KPIs
   ===================================================================== */
function countUp(el, target, fmt) {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { el.textContent = fmt(target); return; }
  var dur = 1400, t0 = null, done = false;
  function finish() { if (done) return; done = true; el.textContent = fmt(target); }
  function step(t) {
    if (done) return;
    if (t0 === null) t0 = t;
    var p = (t - t0) / dur;
    if (p >= 1) { finish(); return; }
    el.textContent = fmt(target * (1 - Math.pow(1 - Math.max(0, p), 3)));
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
  setTimeout(finish, dur + 400);
  window.addEventListener("beforeprint", finish);
}

(function hero() {
  var box = document.getElementById("heroKpis");
  var adhesionTotal = demandas.reduce(function (s,d) { return s + d.aderentes; }, 0);
  var boxItems = [
    { l: "Volume Empenhado via Adesão", v: totalValor, f: brlShort, c: "", sub: int(totalValor) + " reais · " + int(totalItens) + " itens" },
    { l: "Demandas Abertas para Adesão", v: demandas.length, f: int, c: "v", sub: anos.map(function(a){return a+": "+porAno[a].n;}).join("  ·  ") },
    { l: "Unidades Participantes", v: totalParticipantes, f: int, c: "g", sub: Object.keys(unidadesGer).length + " gerenciadoras · " + Object.keys(unidadesAd).length + " aderentes" },
    { l: "Capilaridade Média", v: media(demandas.map(function(d){return d.aderentes;})), f: function(n){return n.toLocaleString("pt-BR",{maximumFractionDigits:1})+" un";}, c: "c", sub: "unidades aderentes por demanda" },
    { l: "Ticket Médio por Demanda", v: media(demandas.map(function(d){return d.valor;})), f: brlShort, c: "y", sub: "volume médio por processo aderido" }
  ];
  box.innerHTML = boxItems.map(function (b) {
    return '<div class="hk ' + b.c + '"><div class="hk-label">' + esc(b.l) + '</div>' +
           '<div class="hk-value" data-v="' + b.v + '">—</div>' +
           '<div class="hk-foot">' + esc(b.sub) + '</div></div>';
  }).join("");
  box.querySelectorAll(".hk").forEach(function (card, i) {
    var b = boxItems[i];
    countUp(card.querySelector(".hk-value"), b.v, b.f);
  });
})();

/* =====================================================================
   PAINEL 1 — primeira demanda + timeline
   ===================================================================== */
var primeira = demandas[0];

(function painel1() {
  document.getElementById("pdSigla").textContent = primeira.siglaGer;
  document.getElementById("pdNome").textContent = primeira.nomeGer;

  var objs = Object.keys(primeira.grupos).map(function (g) { return g + " (" + primeira.grupos[g] + " itens)"; });
  var hcRows = [
    ["Data da Demanda", dataLong(primeira.dCad)],
    ["Unidade Gerenciadora", primeira.siglaGer + " · " + primeira.nomeGer],
    ["Objeto", titleCase(primeira.objeto) + " <span class='muted'>(" + objs.length + " grupo" + (objs.length>1?"s":"") + " de objeto)</span>"],
    ["Grupo de Objeto", primeira.grupo],
    ["Data do Empenho Consolidado", dataLong(primeira.dEmp)]
  ];
  document.getElementById("pdRows").innerHTML = hcRows.map(function (r) {
    return '<div class="hc-row"><b>' + esc(r[0]) + '</b><span>' + r[1] + '</span></div>';
  }).join("");

  document.getElementById("pdValor").textContent = brl(primeira.valor);
  document.getElementById("pdCapilar").innerHTML = primeira.aderentes +
    ' <span style="font-size:13px;font-family:var(--sans);color:var(--ink-2);font-weight:600">aderentes · ' +
    primeira.participantes + ' participantes</span>';
  document.getElementById("pdTempo").innerHTML = primeira.dias +
    ' <span style="font-size:14px;font-family:var(--sans);color:inherit;font-weight:700">dias</span>' +
    ' <span style="font-size:12.5px;font-family:var(--sans);color:var(--ink-2);display:block;font-weight:600">' +
    'da demanda ao empenho · ' + dataCurta(primeira.dCad) + ' → ' + dataCurta(primeira.dEmp) + '</span>';

  /* marcos históricos */
  var marcos = [
    { d: primeira.dCad, t: "Pioneirismo", x: "Primeira demanda aberta para adesão — " + primeira.siglaGer + " cria o marco inicial do programa." },
    { d: primeira.dEmp, t: "Primeiro Empenho", x: "Consolidação da primeira adesão: R$ " + brlShort(primeira.valor) + " e " + primeira.aderentes + " unidades aderidas." }
  ];
  var topo = demandas.slice().sort(function (a, b) { return b.valor - a.valor; })[0];
  marcos.push({ d: topo.dCad, t: "Maior Demanda", x: topo.siglaGer + " lidera em volume: R$ " + brlShort(topo.valor) + " (" + topo.aderentes + " aderentes).", k: "peak" });
  /* mês de maior volume de demandas */
  var porMes = {};
  demandas.forEach(function (d) {
    var k = d.ano + "-" + pad(d.dCad.getMonth() + 1);
    porMes[k] = porMes[k] || { n: 0, ano: d.ano, mes: d.dCad.getMonth() };
    porMes[k].n++;
  });
  var pico = Object.keys(porMes).map(function (k) { return porMes[k]; })
    .sort(function (a, b) { return b.n - a.n; })[0];
  marcos.push({ d: new Date(pico.ano, pico.mes, 15), t: "Pico de Engajamento",
    x: MESES_L[pico.mes] + "/" + pico.ano + ": " + pico.n + " demandas abertas em um único mês.", k: "pico" });
  var maisRecente = demandas[demandas.length - 1];
  marcos.push({ d: maisRecente.dEmp, t: "Empenho Mais Recente",
    x: "Último empenho consolidado em " + dataLong(maisRecente.dEmp) + " — R$ " + brlShort(maisRecente.valor) + ".", k: "recente" });
  marcos.sort(function (a, b) { return a.d - b.d; });
  document.getElementById("marcoStrip").innerHTML = marcos.map(function (m) {
    return '<div class="marco"><div class="m-date">' + dataCurta(m.d) + '</div>' +
           '<div class="m-title">' + esc(m.t) + '</div>' +
           '<div class="m-txt">' + esc(m.x) + '</div></div>';
  }).join("");
})();

/* ---------------- SVG: timeline combo (barras + área) ---------------- */
function niceMax(v) {
  if (v <= 0) return 1;
  var exp = Math.pow(10, Math.floor(Math.log10(v)));
  var f = v / exp;
  var m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return m * exp;
}

(function timelineChart() {
  var wrap = document.getElementById("chartTimeline");
  /* Barras: demandas por mês ; Área: volume empenhado acumulado por mês */
  var meses = [], mapa = {};
  demandas.forEach(function (d) {
    var k = d.ano + "-" + pad(d.dCad.getMonth()+1);
    mapa[k] = mapa[k] || { k: k, ano: d.ano, mes: d.dCad.getMonth(), n: 0, valor: 0 };
    mapa[k].n++; mapa[k].valor += d.valor;
  });
  var ini = demandas[0].dCad, fim = demandas[demandas.length-1].dEmp;
  var cur = new Date(ini.getFullYear(), ini.getMonth(), 1);
  while (cur <= fim) {
    var k = cur.getFullYear() + "-" + pad(cur.getMonth()+1);
    if (!mapa[k]) mapa[k] = { k:k, ano:cur.getFullYear(), mes:cur.getMonth(), n:0, valor:0 };
    meses.push(mapa[k]);
    cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
  }

  var W = 900, H = 330, PL = 52, PR = 52, PT = 18, PB = 34;
  var iw = W - PL - PR, ih = H - PT - PB;
  var maxN = niceMax(Math.max.apply(null, meses.map(function(m){return m.n;})));
  var acc = 0; meses.forEach(function (m) { acc += m.valor; m.acc = acc; });
  var maxA = niceMax(Math.max.apply(null, meses.map(function(m){return m.acc;})));
  var bw = iw / meses.length;
  var svg = [];

  /* grid + eixos */
  for (var g = 0; g <= 4; g++) {
    var y = PT + ih - (ih * g / 4);
    svg.push('<line class="grid-l" x1="'+PL+'" y1="'+y.toFixed(1)+'" x2="'+(PL+iw)+'" y2="'+y.toFixed(1)+'"/>');
    svg.push('<text class="axis-txt" x="'+(PL-9)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+(maxN*g/4).toLocaleString("pt-BR")+'</text>');
    svg.push('<text class="axis-txt" x="'+(PL+iw+9)+'" y="'+(y+4).toFixed(1)+'" text-anchor="start">'+brlAxis(maxA*g/4)+'</text>');
  }
  /* separadores de ano */
  for (var i = 1; i < meses.length; i++) {
    if (meses[i].ano !== meses[i-1].ano) {
      var x = PL + bw * i;
      svg.push('<line class="grid-l" x1="'+x.toFixed(1)+'" y1="'+PT+'" x2="'+x.toFixed(1)+'" y2="'+(PT+ih)+'" stroke="rgba(255,255,255,.14)" stroke-dasharray="4 4"/>');
      svg.push('<text x="'+x.toFixed(1)+'" y="'+(PT+ih+26)+'" text-anchor="middle" style="fill:#4dd4ff;font-size:11px;font-weight:800;font-family:var(--mono)">'+meses[i].ano+'</text>');
    }
  }
  svg.push('<line class="axis-line" x1="'+PL+'" y1="'+(PT+ih)+'" x2="'+(PL+iw)+'" y2="'+(PT+ih)+'"/>');

  /* barras */
  meses.forEach(function (m, i) {
    if (!m.n) return;
    var h = (m.n / maxN) * ih;
    var x = PL + bw*i + bw*0.22, w = bw*0.56;
    var y = PT + ih - h;
    var g = ['<g class="bar-g" data-k="'+m.k+'">'];
    g.push('<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(h,1).toFixed(1)+'" rx="3" fill="url(#gb)"/>');
    g.push('</g>');
    svg.push(g.join(""));
  });

  /* área acumulada */
  var pts = meses.map(function (m, i) {
    return [PL + bw*i + bw/2, PT + ih - (m.acc/maxA)*ih];
  });
  var line = pts.map(function (p,i) { return (i?"L":"M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
  var area = line + " L " + pts[pts.length-1][0].toFixed(1) + " " + (PT+ih) + " L " + pts[0][0].toFixed(1) + " " + (PT+ih) + " Z";
  svg.push('<defs>' +
    '<linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4dd4ff"/><stop offset="1" stop-color="#2a7ff0"/></linearGradient>' +
    '<linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,209,102,.34)"/><stop offset="1" stop-color="rgba(255,209,102,0)"/></linearGradient>' +
    '<linearGradient id="gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#f0932b"/></linearGradient>' +
    '</defs>');
  svg.push('<path d="'+area+'" fill="url(#ga)"/>');
  svg.push('<path d="'+line+'" fill="none" stroke="url(#gl)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>');
  pts.forEach(function (p, i) {
    svg.push('<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="#0a1020" stroke="#ffd166" stroke-width="2" class="pt" data-i="'+i+'"/>');
  });

  /* rótulos de mês (a cada 3) */
  meses.forEach(function (m, i) {
    if (i % 3) return;
    svg.push('<text class="axis-txt" x="'+(PL+bw*i+bw/2).toFixed(1)+'" y="'+(PT+ih+15)+'" text-anchor="middle">'+MESES[m.mes]+'</text>');
  });

  wrap.innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img">' + svg.join("") + '</svg>';

  wrap.querySelectorAll(".bar-g").forEach(function (el) {
    var m = meses.filter(function (x) { return x.k === el.getAttribute("data-k"); })[0];
    if (!m) return;
    bindTip(el, function () {
      return '<div class="t-t">' + MESES_L[m.mes].charAt(0).toUpperCase() + MESES_L[m.mes].slice(1) + ' / ' + m.ano + '</div>' +
        '<div class="t-r"><span>Demandas abertas</span><b>' + m.n + '</b></div>' +
        '<div class="t-r"><span>Volume no mês</span><b>' + brlShort(m.valor) + '</b></div>' +
        '<div class="t-r"><span>Acumulado</span><b>' + brlShort(m.acc) + '</b></div>';
    });
  });
  wrap.querySelectorAll(".pt").forEach(function (el) {
    var m = meses[+el.getAttribute("data-i")];
    bindTip(el, function () {
      return '<div class="t-t">Acumulado até ' + MESES_L[m.mes] + '/' + m.ano + '</div>' +
        '<div class="t-r"><span>Volume total</span><b>' + brlShort(m.acc) + '</b></div>';
    });
  });

  /* track de marcos */
  var track = document.getElementById("tlTrack");
  var t0 = demandas[0].dCad.getTime(), t1 = demandas[demandas.length-1].dEmp.getTime(), span = Math.max(1, t1 - t0);
  track.innerHTML = demandas.map(function (d, i) {
    var p = ((d.dCad.getTime() - t0) / span) * 100;
    return '<span class="tl-node' + (i === 0 ? " first" : "") + '" style="left:' + p.toFixed(2) + '%" data-i="' + i + '"></span>';
  }).join("");
  var ax = document.createElement("div");
  ax.className = "tl-axis";
  ax.innerHTML = '<span>' + dataCurta(demandas[0].dCad) + '</span><span>' +
    MESES_L[demandas[Math.floor(demandas.length/2)].dCad.getMonth()] + ' ' + demandas[Math.floor(demandas.length/2)].dCad.getFullYear() +
    '</span><span>' + dataCurta(demandas[demandas.length-1].dEmp) + '</span>';
  track.parentNode.appendChild(ax);

  track.querySelectorAll(".tl-node").forEach(function (el) {
    var d = demandas[+el.getAttribute("data-i")];
    bindTip(el, function () {
      return '<div class="t-t">' + d.siglaGer + ' · ' + d.cod + '</div>' +
        '<div class="t-r"><span>Cadastro</span><b>' + dataCurta(d.dCad) + '</b></div>' +
        '<div class="t-r"><span>Empenho</span><b>' + dataCurta(d.dEmp) + '</b></div>' +
        '<div class="t-r"><span>Aderentes</span><b>' + d.aderentes + '</b></div>' +
        '<div class="t-r"><span>Valor</span><b>' + brlShort(d.valor) + '</b></div>';
    });
  });
})();

/* =====================================================================
   PAINEL 2 — KPIs
   ===================================================================== */
(function kpis() {
  var box = document.getElementById("kpiGrid");
  var a = porAno[anoAnterior] || { n:0, valor:0, nUn:0 };
  var b = porAno[anoAtual] || { n:0, valor:0, nUn:0 };
  var delta = a.n ? Math.round((b.n - a.n) / a.n * 100) : 0;
  var dValor = a.valor ? Math.round((b.valor - a.valor) / a.valor * 100) : 0;
  var msMed = mediana(demandas.map(function (d) { return d.dias; }));
  var aderentesUnicos = Object.keys(unidadesAd).length;

  var items = [
    { c:"", ic:"📄", l:"Demandas abertas em " + anoAtual + " vs " + anoAnterior,
      v: b.n, f:int, delta: (delta>=0?"▲ +":"▼ ") + delta + "% vs " + anoAnterior + " (" + a.n + ")",
      foot: b.nUn + " unidades participantes no ano · " + int(b.itens) + " itens", spark: b },
    { c:"c", ic:"💰", l:"Volume financeiro empenhado em " + anoAtual,
      v: b.valor, f:brlShort, delta:(dValor>=0?"▲ +":"▼ ") + dValor + "% vs " + anoAnterior, foot:"acumulado total: " + brlShort(totalValor), spark: b },
    { c:"g", ic:"🏛️", l:"Unidades participantes (gerenciadoras + aderentes)",
      v: totalParticipantes, f:int, delta:"+0%", foot: Object.keys(unidadesGer).length + " gerenciadoras · " + aderentesUnicos + " aderentes · " + totalItens + " itens", spark: null },
    { c:"v", ic:"⏱️", l:"Tempo médio do processo", v: media(demandas.map(function(d){return d.dias;})), f:function(n){return n.toLocaleString("pt-BR",{maximumFractionDigits:0})+" d";},
      delta:"mediana " + msMed + " d", foot:"cadastro → empenho · " + demandas.length + " processos", spark: null },
    { c:"y", ic:"📈", l:"Economia de escala (R$ por item aderido)",
      v: totalValor / Math.max(1, Object.keys(unidadesAd).length), f:brlShort, delta:"média por demanda " + brlShort(totalValor / demandas.length),
      foot: brlShort(totalValor / Math.max(1,totalItens)) + " por item empenhado", spark: null },
    { c:"g", ic:"🎯", l:"Demandas com mais de 10 aderentes",
      v: demandas.filter(function (d) { return d.aderentes > 10; }).length, f:int, delta:"de " + demandas.length,
      foot: "cobertura média " + media(demandas.map(function(d){return d.aderentes;})).toLocaleString("pt-BR",{maximumFractionDigits:1}) + " un/demanda", spark: null }
  ];

  box.innerHTML = items.map(function (it, i) {
    var sp = "";
    if (it.spark) {
      sp = '<svg class="kpi-spark" viewBox="0 0 200 34" preserveAspectRatio="none">' +
        anos.map(function (yy, j) {
          var v = porAno[yy][it.l.indexOf("Volume") > -1 ? "valor" : "n"];
          var max = Math.max.apply(null, anos.map(function (y2){ return porAno[y2][it.l.indexOf("Volume") > -1 ? "valor" : "n"]; }));
          var h = max ? 26 * v / max : 0, x = j * (200 / anos.length) + 8, w = 200 / anos.length - 16;
          return '<rect x="'+x.toFixed(1)+'" y="'+(32-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(h,2).toFixed(1)+'" rx="3" fill="rgba(77,212,255,.55)"/>' +
                 '<text x="'+(x+w/2).toFixed(1)+'" y="'+(36).toFixed(1)+'" text-anchor="middle" style="fill:#6f7d9c;font-size:9px;font-family:var(--mono)">'+yy+'</text>';
        }).join("") + '</svg>';
    }
    return '<div class="kpi ' + it.c + '">' +
      '<div class="kpi-ic">' + it.ic + '</div>' +
      '<div class="kpi-label">' + esc(it.l) + '</div>' +
      '<div class="kpi-value" data-v="' + it.v + '">—</div>' +
      '<div class="kpi-foot"><span class="kpi-delta' + (it.delta.indexOf("▼") === 0 ? " down" : "") + '">' + esc(it.delta) + '</span></div>' +
      '<div class="kpi-foot" style="margin-top:6px">' + esc(it.foot) + '</div>' + sp + '</div>';
  }).join("");

  box.querySelectorAll(".kpi-value").forEach(function (el, i) {
    countUp(el, items[i].v, items[i].f);
  });
})();

/* =====================================================================
   PAINEL 2 — tabela
   ===================================================================== */
var estado = { view: "agg", ano: "", ger: "", q: "", sort: "dCad", dir: -1, page: 0, per: 12, open: {} };

var COLS_AGG = [
  { k: "cod",   t: "Código da Compra", s: true },
  { k: "dCad",  t: "Data do Cadastro",  s: true, f: dataCurta },
  { k: "ger",   t: "Unidade Gerenciadora", s: true },
  { k: "grupo", t: "Objeto / Grupo", s: true },
  { k: "aderentes", t: "Unidades Aderidas", s: true, num: true },
  { k: "dEmp",  t: "Data do Empenho", s: true, f: dataCurta },
  { k: "dias",  t: "Prazo", s: true, num: true, f: function (v) { return v != null ? v + " d" : "—"; } },
  { k: "valor", t: "Valor Final Empenhado", s: true, num: true, f: brl }
];
var COLS_ITEM = [
  { k: "cod",   t: "Código da Compra", s: true },
  { k: "dCad",  t: "Data do Cadastro", s: true, f: dataCurta },
  { k: "ger",   t: "Unidade Gerenciadora", s: true },
  { k: "siglaAd", t: "Unidade Aderida", s: true },
  { k: "grupo", t: "Objeto / Grupo", s: true },
  { k: "objeto", t: "Objeto", s: false },
  { k: "dEmp",  t: "Data do Empenho", s: true, f: dataCurta },
  { k: "valor", t: "Valor Empenhado", s: true, num: true, f: brl }
];

function keyOf(o, k) {
  switch (k) {
    case "cod": return o.cod;
    case "dCad": return o.dCad ? o.dCad.getTime() : 0;
    case "dEmp": return o.dEmp ? o.dEmp.getTime() : 0;
    case "ger": return o.siglaGer || "";
    case "siglaAd": return o.siglaAd || "";
    case "grupo": return o.grupo || "";
    case "objeto": return o.objeto || "";
    case "aderentes": return o.aderentes;
    case "dias": return o.dias == null ? -1 : o.dias;
    case "valor": return o.valor;
  }
  return "";
}

function filtrar() {
  var q = norm(estado.q);
  var base = estado.view === "agg" ? demandas : rows;
  var out = base.filter(function (o) {
    if (estado.ano && String(o.ano) !== estado.ano) return false;
    if (estado.ger && o.siglaGer !== estado.ger) return false;
    if (q) {
      var hay = estado.view === "agg"
        ? norm(o.cod + " " + o.siglaGer + " " + o.nomeGer + " " + o.grupo + " " + o.objeto + " " +
               Object.keys(o.unidades).map(function (k) { return o.unidades[k].nome + " " + o.unidades[k].sigla; }).join(" "))
        : norm(o.cod + " " + o.siglaGer + " " + o.nomeGer + " " + o.siglaAd + " " + o.nomeAd + " " + o.grupo + " " + o.objeto);
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
  var k = estado.sort, d = estado.dir;
  out.sort(function (a, b) {
    var va = keyOf(a, k), vb = keyOf(b, k);
    if (va < vb) return -1 * d;
    if (va > vb) return 1 * d;
    return 0;
  });
  return out;
}

function renderTabela() {
  var cols = estado.view === "agg" ? COLS_AGG : COLS_ITEM;
  var data = filtrar();
  var pages = Math.max(1, Math.ceil(data.length / estado.per));
  if (estado.page >= pages) estado.page = pages - 1;
  var slice = data.slice(estado.page * estado.per, estado.page * estado.per + estado.per);

  var thead = "<tr>" + cols.map(function (c) {
    var ar = estado.sort === c.k ? '<span class="ar">' + (estado.dir === 1 ? "▲" : "▼") + "</span>" : "";
    return '<th data-k="' + c.k + '"' + (c.s ? "" : ' style="cursor:default"') + '>' + esc(c.t) + ar + '</th>';
  }).join("") + "</tr>";

  var tbody = slice.map(function (o) {
    if (estado.view === "agg") {
      var un = Object.keys(o.unidades).map(function (c) { return o.unidades[c]; })
        .sort(function (a, b) { return b.val - a.val; });
      var principal = un.filter(function (u) { return u.sigla !== o.siglaGer; })[0] || un[0];
      var cells =
        '<td><span class="mono">' + esc(o.cod) + '</span>' +
          (o.gruposDistintos > 1 ? '<div class="muted" style="font-size:11px">' + o.gruposDistintos + ' grupos de objeto</div>' : '') + '</td>' +
        '<td class="mono">' + dataCurta(o.dCad) + '</td>' +
        '<td><span class="sigla">' + esc(o.siglaGer) + '</span><div class="muted" style="font-size:11.5px;margin-top:4px">' + esc(o.nomeGer) + '</div></td>' +
        '<td><span class="pill">' + esc(o.grupo) + '</span>' +
          '<span class="objtxt" style="margin-top:6px">' + esc(titleCase(o.objeto)) + '</span></td>' +
        '<td class="num"><b style="color:#6ff0e0">' + o.aderentes + '</b><div class="muted" style="font-size:11px">' + o.participantes + ' participantes</div></td>' +
        '<td class="mono">' + dataCurta(o.dEmp) + '</td>' +
        '<td class="num muted">' + (o.dias != null ? o.dias + " d" : "—") + '</td>' +
        '<td class="num"><b>' + brl(o.valor) + '</b></td>';
      var open = estado.open[o.cod];
      var exp = open
        ? '<tr class="exp"><td colspan="' + cols.length + '"><div class="exp-box">' +
            '<h5>Unidades participantes · ' + o.participantes + ' (' + o.aderentes + ' aderentes) · ' + o.itens.length + ' itens empenhados</h5>' +
            '<div class="exp-list">' + un.map(function (u) {
              return '<div class="exp-item"><span><b style="color:#cfe4ff">' + esc(u.sigla) + '</b> · ' + esc(u.nome) + '</span><b>' + brl(u.val) + '</b></div>';
            }).join("") + '</div></div></td></tr>'
        : "";
      return '<tr class="' + (open ? "open" : "") + '" data-cod="' + o.cod + '" style="cursor:pointer">' + cells + '</tr>' + exp;
    }
    return '<tr>' +
      '<td class="mono">' + esc(o.cod) + '</td>' +
      '<td class="mono">' + dataCurta(o.dCad) + '</td>' +
      '<td><span class="sigla">' + esc(o.siglaGer) + '</span><div class="muted" style="font-size:11.5px;margin-top:4px">' + esc(o.nomeGer) + '</div></td>' +
      '<td><span class="sigla g">' + esc(o.siglaAd) + '</span><div class="muted" style="font-size:11.5px;margin-top:4px">' + esc(o.nomeAd) + '</div></td>' +
      '<td><span class="pill">' + esc(o.grupo) + '</span></td>' +
      '<td><span class="objtxt">' + esc(o.objeto) + '</span></td>' +
      '<td class="mono">' + dataCurta(o.dEmp) + '</td>' +
      '<td class="num"><b>' + brl(o.val) + '</b></td></tr>';
  }).join("");

  if (!slice.length) tbody = '<tr><td colspan="' + cols.length + '"><div class="empty">Nenhum registro encontrado para os filtros aplicados.</div></td></tr>';

  var tbl = document.getElementById("tbl");
  tbl.querySelector("thead").innerHTML = thead;
  tbl.querySelector("tbody").innerHTML = tbody;

  var soma = data.reduce(function (s, o) { return s + o.valor; }, 0);
  document.getElementById("tableMeta").innerHTML =
    '<b>' + int(data.length) + '</b> ' + (estado.view === "agg" ? "demandas" : "itens") +
    ' · volume filtrado <b>' + brl(soma) + '</b>' +
    (estado.view === "agg" ? ' · ' + data.reduce(function (s,o){return s+o.aderentes;},0) + ' adesões' : '');

  /* paginação */
  var p = document.getElementById("pager");
  var btns = [];
  btns.push('<button data-p="0" ' + (estado.page === 0 ? "disabled" : "") + '>«</button>');
  btns.push('<button data-p="' + (estado.page-1) + '" ' + (estado.page === 0 ? "disabled" : "") + '>‹</button>');
  var ini = Math.max(0, Math.min(estado.page - 2, pages - 5));
  for (var i = ini; i < Math.min(pages, ini + 5); i++) {
    btns.push('<button data-p="' + i + '" class="' + (i === estado.page ? "on" : "") + '">' + (i+1) + '</button>');
  }
  btns.push('<button data-p="' + (estado.page+1) + '" ' + (estado.page >= pages-1 ? "disabled" : "") + '>›</button>');
  btns.push('<button data-p="' + (pages-1) + '" ' + (estado.page >= pages-1 ? "disabled" : "") + '>»</button>');
  p.innerHTML = '<span class="pinfo">página ' + (estado.page+1) + ' de ' + pages + '</span>' + btns.join("");

  p.querySelectorAll("button").forEach(function (b) {
    b.onclick = function () { estado.page = Math.max(0, +b.getAttribute("data-p")); renderTabela(); tbl.parentNode.scrollTop = 0; };
  });

  /* sort */
  tbl.querySelectorAll("th").forEach(function (th) {
    if (th.style.cursor === "default") return;
    th.onclick = function () {
      var k = th.getAttribute("data-k");
      if (estado.sort === k) estado.dir = -estado.dir;
      else { estado.sort = k; estado.dir = -1; }
      renderTabela();
    };
  });

  /* expandir linha */
  if (estado.view === "agg") {
    tbl.querySelectorAll("tbody tr[data-cod]").forEach(function (tr) {
      tr.onclick = function () {
        var c = tr.getAttribute("data-cod");
        estado.open[c] = !estado.open[c];
        renderTabela();
      };
    });
  }
}

/* filtros */
(function initFiltros() {
  var sAno = document.getElementById("fAno");
  anos.forEach(function (a) {
    var o = document.createElement("option"); o.value = a; o.textContent = a + " (" + porAno[a].n + " demandas)"; sAno.appendChild(o);
  });
  var sGer = document.getElementById("fGer");
  var gers = Object.keys(unidadesGer).map(function (s) { return unidadesGer[s]; })
    .filter(function (g) { return g.nDem > 0; })
    .sort(function (a, b) { return b.nDem - a.nDem; });
  gers.forEach(function (g) {
    var o = document.createElement("option"); o.value = g.sigla; o.textContent = g.sigla + " (" + g.nDem + ")"; sGer.appendChild(o);
  });

  sAno.onchange = function () { estado.ano = this.value; estado.page = 0; renderTabela(); };
  sGer.onchange = function () { estado.ger = this.value; estado.page = 0; renderTabela(); };
  var t;
  document.getElementById("fBusca").oninput = function () {
    var v = this.value; clearTimeout(t);
    t = setTimeout(function () { estado.q = v; estado.page = 0; renderTabela(); }, 220);
  };
  document.querySelectorAll("#viewSeg button").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll("#viewSeg button").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      estado.view = b.getAttribute("data-view");
      estado.page = 0; estado.open = {};
      estado.per = estado.view === "agg" ? 12 : 25;
      estado.sort = estado.view === "agg" ? "dCad" : "dCad";
      renderTabela();
    };
  });

  /* CSV */
  document.getElementById("btnCsv").onclick = function () {
    var data = filtrar();
    var head = estado.view === "agg"
      ? ["codCompra","dataCadastro","unidadeGerenciadora","nomeUnidadeGerenciadora","grupoObjeto","objeto","unidadesAderidas","unidadesParticipantes","dataEmpenho","diasProcesso","valorEmpenhado"]
      : ["codCompra","dataCadastro","unidadeGerenciadora","nomeUnidadeGerenciadora","unidadeAderida","nomeUnidadeAderida","grupoObjeto","objeto","dataEmpenho","valorEmpenhado"];
    var lines = [head.join(";")];
    data.forEach(function (o) {
      if (estado.view === "agg") {
        lines.push([o.cod, o.dCadTxt, o.siglaGer, o.nomeGer, o.grupo, o.objeto, o.aderentes, o.participantes, o.dEmpTxt, o.dias, o.valor.toFixed(2)]
          .map(csv).join(";"));
      } else {
        lines.push([o.cod, o.dCadTxt, o.siglaGer, o.nomeGer, o.siglaAd, o.nomeAd, o.grupo, o.objeto, o.dEmpTxt, o.val.toFixed(2)]
          .map(csv).join(";"));
      }
    });
    var corpo = "\ufeff" + lines.join("\r\n");
    var url = URL.createObjectURL(new Blob([corpo], { type: "text/csv;charset=utf-8;" }));
    var a = document.createElement("a");
    a.href = url; a.download = "adesao-compras-" + estado.view + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  };
  function csv(v) { var s = String(v == null ? "" : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }

  renderTabela();
})();

/* =====================================================================
   PAINEL 3 — rankings
   ===================================================================== */
function hBar(el, items, opt) {
  opt = opt || {};
  var W = 900, rowH = opt.rowH || 34, padT = 6, padB = 24, lblW = opt.lblW || 128, valW = opt.valW || 96;
  var H = padT + items.length * rowH + padB;
  var iw = W - lblW - valW;
  var max = Math.max.apply(null, items.map(function (d) { return d.value; })) || 1;
  var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMinYMin meet" role="img">'];
  svg.push('<defs><linearGradient id="' + (opt.gid || "g1") + '" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="' + (opt.c1 || "#2a7ff0") + '"/>' +
    '<stop offset="1" stop-color="' + (opt.c2 || "#35e0d0") + '"/></linearGradient></defs>');
  items.forEach(function (d, i) {
    var y = padT + i * rowH;
    var bh = Math.min(20, rowH - 14);
    var w = Math.max(3, (d.value / max) * iw);
    var g = ['<g class="bar-g" data-i="' + i + '">'];
    g.push('<rect x="' + lblW + '" y="' + (y + (rowH - bh)/2).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + bh + '" rx="' + (bh/2) + '" fill="url(#' + (opt.gid || "g1") + ')"/>');
    g.push('<text class="bar-lbl" x="' + (lblW - 12) + '" y="' + (y + rowH/2 + 4).toFixed(1) + '" text-anchor="end">' + esc(d.label) + '</text>');
    g.push('<text class="bar-val" x="' + (lblW + w + 10).toFixed(1) + '" y="' + (y + rowH/2 + 4).toFixed(1) + '">' + esc(d.display) + '</text>');
    if (i < items.length - 1) g.push('<line class="grid-l" x1="' + lblW + '" y1="' + (y + rowH).toFixed(1) + '" x2="' + (W - valW + 8) + '" y2="' + (y + rowH).toFixed(1) + '"/>');
    g.push('</g>');
    svg.push(g.join(""));
  });
  svg.push('</svg>');
  el.innerHTML = svg.join("");
  el.querySelectorAll(".bar-g").forEach(function (g) {
    var d = items[+g.getAttribute("data-i")];
    bindTip(g, function () { return d.tip; });
  });
}

(function painel3() {
  /* gerenciadoras por nº de demandas */
  var gers = Object.keys(unidadesGer).map(function (s) { return unidadesGer[s]; })
    .filter(function (g) { return g.nDem > 0; })
    .sort(function (a, b) { return b.nDem - a.nDem || b.val - a.val; })
    .slice(0, 12);
  hBar(document.getElementById("chartGer"), gers.map(function (g) {
    return { label: g.sigla, value: g.nDem, display: g.nDem + (g.nDem === 1 ? " demanda" : " demandas"),
      tip: '<div class="t-t">' + esc(g.sigla) + '</div><div class="t-r"><span>' + esc(g.nome) + '</span><b></b></div>' +
        '<div class="t-r"><span>Demandas abertas</span><b>' + g.nDem + '</b></div>' +
        '<div class="t-r"><span>Itens gerenciados</span><b>' + g.itens + '</b></div>' };
  }), { gid: "gg", c1: "#2a7ff0", c2: "#35e0d0", lblW: 100, valW: 110 });

  /* aderentes por volume */
  var aders = Object.keys(unidadesAd).map(function (s) { return unidadesAd[s]; })
    .sort(function (a, b) { return b.val - a.val; })
    .slice(0, 10);
  var totalAder = aders.reduce(function (s, a) { return s + a.val; }, 0);
  hBar(document.getElementById("chartAder"), aders.map(function (a) {
    return { label: a.sigla, value: a.val, display: brlShort(a.val),
      tip: '<div class="t-t">' + esc(a.sigla) + '</div><div class="t-r"><span>' + esc(a.nome) + '</span><b></b></div>' +
        '<div class="t-r"><span>Volume empenhado</span><b>' + brl(a.val) + '</b></div>' +
        '<div class="t-r"><span>Itens aderidos</span><b>' + a.itens + '</b></div>' +
        '<div class="t-r"><span>Demandas aderidas</span><b>' + a.nDem + '</b></div>' };
  }), { gid: "ga2", c1: "#f0932b", c2: "#ffd166", lblW: 100, valW: 110, rowH: 32 });
})();

/* =====================================================================
   PAINEL 4 — escala, tempo, categorias
   ===================================================================== */
(function painel4() {
  /* --- Economia de escala --- */
  var aderidas = demandas.filter(function (d) { return d.aderentes > 0; });
  var individuais = demandas.filter(function (d) { return d.aderentes === 0; });
  var volAgrupado = aderidas.reduce(function (s, d) { return s + d.valor; }, 0);
  var volIndividual = individuais.reduce(function (s, d) { return s + d.valor; }, 0);
  var ticketAgrupado = aderidas.length ? volAgrupado / aderidas.length : 0;
  var ticketIndividual = individuais.length ? volIndividual / individuais.length : 0;
  var porUnidade = totalValor / Math.max(1, demandas.reduce(function (s, d) { return s + d.aderentes; }, 0));
  var itens = rows.length;
  var porItem = totalValor / Math.max(1, itens);

  var maxEs = Math.max(ticketAgrupado, ticketIndividual, porUnidade, porItem) || 1;
  var nAderencias = demandas.reduce(function (s, d) { return s + d.aderentes; }, 0);
  var linhas = [
    { l: "Volume médio por demanda agrupada", v: ticketAgrupado, c: "linear-gradient(90deg,#2a7ff0,#35e0d0)", s: aderidas.length + " processos com adesão" },
    { l: "Volume médio por demanda individual", v: ticketIndividual, c: "linear-gradient(90deg,#6f7d9c,#8fa7c9)", s: individuais.length + " processo sem adesão" },
    { l: "Volume médio por unidade aderente", v: porUnidade, c: "linear-gradient(90deg,#9b6bff,#35e0d0)", s: int(nAderencias) + " adesões" },
    { l: "Volume médio por item empenhado", v: porItem, c: "linear-gradient(90deg,#ffd166,#f0932b)", s: int(itens) + " itens" }
  ];
  document.getElementById("escalaBox").innerHTML =
    '<div class="escala">' + linhas.map(function (r) {
      return '<div class="escala-row"><div class="escala-lbl"><span>' + esc(r.l) + ' <span class="muted">· ' + esc(r.s) + '</span></span><b>' + brlShort(r.v) + '</b></div>' +
        '<div class="escala-bar"><i data-w="' + (r.v / maxEs * 100).toFixed(1) + '" style="background:' + r.c + '"></i></div></div>';
    }).join("") + '</div>' +
    '<div class="escala-note"><b>Ganho de escala:</b> uma demanda que agrega múltiplas unidades ' +
    'mobiliza <b>' + brlShort(ticketAgrupado) + '</b> em <b>um único processo</b> — ' +
    (individuais.length
      ? (ticketIndividual ? (ticketAgrupado/ticketIndividual).toLocaleString("pt-BR",{maximumFractionDigits:0}) + '× o volume' : '') +
        ' do ticket médio da modalidade individual (<b>' + brlShort(ticketIndividual) + '</b>, ' + individuais.length + ' caso).'
      : 'nenhuma demanda individual no período, o que evidencia a Vocação adesiva do programa.') +
    ' Cada <b>adesão</b> evita um processo licitatório próprio.</div>';

  /* --- Tempo médio do processo --- */
  var faixas = [
    { l: "0–30 d",  a: 0,  b: 30 },
    { l: "31–60 d", a: 30, b: 60 },
    { l: "61–90 d", a: 60, b: 90 },
    { l: "91–120 d",a: 90, b: 120 },
    { l: "121–180 d",a: 120, b: 180 },
    { l: "> 180 d", a: 180, b: 1e9 }
  ];
  faixas.forEach(function (f) {
    f.n = demandas.filter(function (d) { return d.dias != null && d.dias > f.a && d.dias <= f.b; }).length;
  });
  var maxF = Math.max.apply(null, faixas.map(function (f) { return f.n; })) || 1;
  var W = 520, H = 250, PL = 34, PR = 12, PT = 14, PB = 40;
  var iw = W - PL - PR, ih = H - PT - PB, bw = iw / faixas.length;
  var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img">'];
  svg.push('<defs><linearGradient id="gt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#35e0d0"/><stop offset="1" stop-color="#2a7ff0"/></linearGradient></defs>');
  for (var g = 0; g <= 4; g++) {
    var y = PT + ih - ih*g/4;
    svg.push('<line class="grid-l" x1="'+PL+'" y1="'+y.toFixed(1)+'" x2="'+(PL+iw)+'" y2="'+y.toFixed(1)+'"/>');
    svg.push('<text class="axis-txt" x="'+(PL-8)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+(maxF*g/4).toFixed(0)+'</text>');
  }
  faixas.forEach(function (f, i) {
    var h = f.n / maxF * ih, x = PL + bw*i + bw*0.18, w = bw*0.64;
    svg.push('<g class="bar-g" data-i="' + i + '">' +
      '<rect x="'+x.toFixed(1)+'" y="'+(PT+ih-h).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(h,1).toFixed(1)+'" rx="4" fill="url(#gt)"/></g>');
    svg.push('<text class="axis-txt" x="'+(x+w/2).toFixed(1)+'" y="'+(PT+ih+17)+'" text-anchor="middle">'+f.l+'</text>');
    if (f.n) svg.push('<text class="bar-val" x="'+(x+w/2).toFixed(1)+'" y="'+(PT+ih-h-6).toFixed(1)+'" text-anchor="middle">'+f.n+'</text>');
  });
  svg.push('<line class="axis-line" x1="'+PL+'" y1="'+(PT+ih)+'" x2="'+(PL+iw)+'" y2="'+(PT+ih)+'"/>');
  svg.push('</svg>');
  var ct = document.getElementById("chartTempo");
  ct.innerHTML = svg.join("");
  ct.querySelectorAll(".bar-g").forEach(function (g) {
    var f = faixas[+g.getAttribute("data-i")];
    bindTip(g, function () {
      return '<div class="t-t">' + f.l + '</div><div class="t-r"><span>Demandas</span><b>' + f.n + '</b></div>' +
        '<div class="t-r"><span>Participação</span><b>' + (f.n / demandas.length * 100).toFixed(1).replace(".", ",") + '%</b></div>';
    });
  });

  var dias = demandas.map(function (d) { return d.dias; }).filter(function (v) { return v != null; });
  document.getElementById("tempoStats").innerHTML =
    '<div class="stat"><b>' + Math.round(media(dias)) + ' d</b><span>Média</span></div>' +
    '<div class="stat"><b>' + Math.round(mediana(dias)) + ' d</b><span>Mediana</span></div>' +
    '<div class="stat"><b>' + Math.min.apply(null, dias) + ' d</b><span>Mais rápido</span></div>';

  /* --- Categorias (donut) --- */
  var porFam = {};
  rows.forEach(function (r) {
    var f = porFam[r.fam] || (porFam[r.fam] = { nome: r.fam, itens: 0, valor: 0, unidades: {} });
    f.itens++; f.valor += r.val; f.unidades[r.siglaAd] = 1;
  });
  var fams = Object.keys(porFam).map(function (k) { return porFam[k]; })
    .map(function (f) { f.un = Object.keys(f.unidades).length; return f; })
    .sort(function (a, b) { return b.valor - a.valor; });
  var totalF = fams.reduce(function (s, f) { return s + f.valor; }, 0);

  var size = 230, R = size/2, r = 70, cx = R, cy = R, C = 2*Math.PI*r;
  var d0 = ['<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" style="transform:rotate(-90deg)">'];
  var acc2 = 0;
  fams.forEach(function (f, i) {
    var frac = f.valor / totalF;
    var len = frac * C;
    d0.push('<circle class="arc" data-i="' + i + '" cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" ' +
      'stroke="' + (PAL[f.nome] || "#6f7d9c") + '" stroke-width="34" stroke-linecap="butt" ' +
      'stroke-dasharray="' + (Math.max(len-1.5,0.5)).toFixed(2) + ' ' + (C - Math.max(len-1.5,0.5)).toFixed(2) + '" ' +
      'stroke-dashoffset="' + (-acc2).toFixed(2) + '" style="transition:stroke-width .18s"/>');
    acc2 += len;
  });
  d0.push('</svg>');
  var dn = document.getElementById("chartCat");
  dn.innerHTML = d0.join("") +
    '<div class="d-center"><div class="d-total">' + brlShort(totalF) + '</div><div class="d-lab">Total empenhado</div></div>';
  dn.querySelectorAll(".arc").forEach(function (a) {
    var f = fams[+a.getAttribute("data-i")];
    a.onmouseenter = function () { a.setAttribute("stroke-width", "40"); };
    a.onmouseleave = function () { a.setAttribute("stroke-width", "34"); };
    bindTip(a, function () {
      return '<div class="t-t">' + esc(f.nome) + '</div>' +
        '<div class="t-r"><span>Valor empenhado</span><b>' + brl(f.valor) + '</b></div>' +
        '<div class="t-r"><span>Participação</span><b>' + (f.valor/totalF*100).toFixed(1).replace(".",",") + '%</b></div>' +
        '<div class="t-r"><span>Itens</span><b>' + f.itens + '</b></div>' +
        '<div class="t-r"><span>Unidades</span><b>' + f.un + '</b></div>';
    });
  });

  document.getElementById("catLegend").innerHTML = fams.map(function (f) {
    return '<li data-n="' + esc(f.nome) + '"><i style="background:' + (PAL[f.nome] || "#6f7d9c") + '"></i>' +
      '<span class="lg-n">' + esc(f.nome) + '</span>' +
      '<span><span class="lg-v">' + brlShort(f.valor) + '</span> <span class="lg-p">' + (f.valor/totalF*100).toFixed(1).replace(".",",") + '%</span></span></li>';
  }).join("");
  document.querySelectorAll("#catLegend li").forEach(function (li) {
    var nome = li.getAttribute("data-n");
    var f = porFam[nome];
    li.addEventListener("mouseenter", function () {
      var idx = fams.indexOf(f);
      var arc = dn.querySelector('.arc[data-i="' + idx + '"]');
      if (arc) { arc.setAttribute("stroke-width","40"); arc.scrollIntoView; }
    });
    li.addEventListener("mouseleave", function () {
      var idx = fams.indexOf(f);
      var arc = dn.querySelector('.arc[data-i="' + idx + '"]');
      if (arc) arc.setAttribute("stroke-width","34");
    });
  });
})();

/* ---------------- barras animadas ---------------- */
var io = new IntersectionObserver(function (es) {
  es.forEach(function (e) {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll(".escala-bar i").forEach(function (i) { i.style.width = i.getAttribute("data-w") + "%"; });
    io.unobserve(e.target);
  });
}, { threshold: 0.25 });
var eb = document.querySelector("#escalaBox");
if (eb) io.observe(eb);

/* ---------------- footer ---------------- */
document.getElementById("footSub").textContent =
  int(totalItens) + " itens · " + demandas.length + " demandas · " + int(totalValor) + " de valor empenhado · " +
  anos[0] + "–" + anos[anos.length-1];

})();
