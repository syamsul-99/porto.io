/**
 * main.js — Portofolio "Traveler" (tema Genshin Impact)
 *
 * Entry point JavaScript yang dibundle oleh Vite (lihat <script type="module"> di index.html).
 * Isi file ini:
 *   1. initNavigation   : pindah section, sinkron URL hash, navigasi keyboard
 *   2. initBackground   : partikel bintang, efek klik, parallax cincin
 *   3. initTypewriter   : efek mengetik pada peran di sidebar
 *   4. initSkillSearch  : pencarian skill secara langsung (live filter)
 *   5. initProjectFilter: filter proyek berdasarkan kategori
 *   6. initContactForm  : form kontak dengan validasi + draft di localStorage
 *   7. initChat         : chatbot Katheryne (jawaban lokal dari isi halaman, Gemini opsional)
 */
import './extra.css';

/* ========================================================================
   Helper
   ======================================================================== */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const clean = (text = '') => text.replace(/\s+/g, ' ').trim();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function isTypingTarget(el) {
  return (
    el instanceof HTMLElement &&
    (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
  );
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ========================================================================
   1. Navigasi section
   ======================================================================== */
function initNavigation() {
  const menuItems = $$('.menu-item');
  const panel = $('#content-display');
  const sections = $$('.content-section');
  const ids = menuItems.map((item) => item.dataset.target);

  let current = menuItems.find((item) => item.classList.contains('active'))?.dataset.target ?? ids[0];
  let timer;

  function show(id, { updateHash = true } = {}) {
    if (!ids.includes(id) || id === current) return;
    current = id;

    const item = menuItems.find((m) => m.dataset.target === id);
    menuItems.forEach((m) => {
      const active = m === item;
      m.classList.toggle('active', active);
      m.setAttribute('aria-selected', String(active));
    });
    panel.style.setProperty('--el', getComputedStyle(item).getPropertyValue('--el'));
    panel.classList.remove('visible');

    clearTimeout(timer);
    timer = setTimeout(() => {
      sections.forEach((section) => section.classList.add('hidden'));
      $(`#content-${id}`)?.classList.remove('hidden');
      panel.scrollTop = 0;
      panel.classList.add('visible');

      // Di layar kecil menu dan konten bertumpuk; bawa konten ke layar agar perpindahan terlihat
      if (window.matchMedia('(max-width: 767px)').matches) {
        panel.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }, reducedMotion ? 0 : 400);

    // replaceState: URL bisa dibagikan (#proyek) tanpa menumpuk riwayat tombol Back
    if (updateHash) history.replaceState(null, '', `#${id}`);
  }

  // Aksesibilitas: menu bisa difokus dan dioperasikan dengan keyboard
  menuItems[0]?.parentElement?.setAttribute('role', 'tablist');
  menuItems.forEach((item, index) => {
    item.tabIndex = 0;
    item.setAttribute('role', 'tab');
    item.setAttribute('aria-selected', String(item.classList.contains('active')));

    item.addEventListener('click', () => show(item.dataset.target));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        show(item.dataset.target);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        const next = menuItems[(index + step + menuItems.length) % menuItems.length];
        next.focus();
        show(next.dataset.target);
      }
    });
  });

  // Pintasan angka 1..n untuk pindah section (dinonaktifkan saat mengetik)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
    const number = Number(e.key);
    if (Number.isInteger(number) && number >= 1 && number <= ids.length) show(ids[number - 1]);
  });

  // Buka section sesuai hash saat halaman dimuat dan saat hash diubah manual
  const fromHash = () => show(location.hash.slice(1), { updateHash: false });
  window.addEventListener('hashchange', fromHash);
  fromHash();

  return { show };
}

/* ========================================================================
   2. Latar belakang interaktif
   ======================================================================== */
function initBackground() {
  const motes = $('.motes');
  if (motes) {
    const colors = ['#f3d68e', '#f3d68e', '#ffffff', '#74c2a8', '#4cc2f1', '#b08fc2'];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 26; i++) {
      const star = document.createElement('b');
      const size = 5 + Math.random() * 9;
      star.style.cssText =
        `left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `--c:${colors[i % colors.length]};--dx:${(Math.random() - 0.5) * 120}px;` +
        `animation-duration:${10 + Math.random() * 14}s;animation-delay:${-Math.random() * 20}s`;
      fragment.append(star);
    }
    motes.append(fragment);
  }

  // Percikan bintang di titik klik
  document.addEventListener('pointerdown', (e) => {
    if (reducedMotion) return;
    for (let i = 0; i < 6; i++) {
      const spark = document.createElement('b');
      spark.className = 'burst';
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
      const distance = 28 + Math.random() * 28;
      spark.style.cssText =
        `left:${e.clientX}px;top:${e.clientY}px;` +
        `--x:${Math.cos(angle) * distance}px;--y:${Math.sin(angle) * distance}px`;
      document.body.append(spark);
      setTimeout(() => spark.remove(), 700);
    }
  });

  // Parallax cincin mengikuti kursor, dibatasi satu update per frame
  let frame = 0;
  document.addEventListener('pointermove', (e) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      const root = document.documentElement.style;
      root.setProperty('--mx', e.clientX / innerWidth - 0.5);
      root.setProperty('--my', e.clientY / innerHeight - 0.5);
      frame = 0;
    });
  });
}

/* ========================================================================
   3. Efek mengetik
   ======================================================================== */
function initTypewriter() {
  const el = $('#typewriter');
  if (!el || reducedMotion) return; // teks statis di HTML tetap tampil

  const roles = [
    el.textContent.trim(),
    'Pengembangan Web & Mobile',
    'Jaringan Komputer',
    'Embedded Systems',
  ];
  let roleIndex = 0;
  let charCount = roles[0].length;
  let deleting = true;

  function tick() {
    const word = roles[roleIndex];
    charCount += deleting ? -1 : 1;
    el.textContent = word.slice(0, charCount) || '\u200b'; // zero-width space agar tinggi baris stabil

    let delay = deleting ? 35 : 70;
    if (!deleting && charCount === word.length) {
      deleting = true;
      delay = 1700;
    } else if (deleting && charCount === 0) {
      deleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 350;
    }
    setTimeout(tick, delay);
  }

  setTimeout(tick, 2200);
}

/* ========================================================================
   4. Pencarian skill
   ======================================================================== */
function initSkillSearch() {
  const input = $('#skill-search');
  if (!input) return;

  const groups = $$('#content-keterampilan .space-y-6 > div');
  const tags = $$('#content-keterampilan .skill-tag');
  const status = $('#skill-status');
  const empty = $('#skill-empty');

  function apply() {
    const query = input.value.trim().toLowerCase();
    let visible = 0;

    groups.forEach((group) => {
      let visibleInGroup = 0;
      $$('.skill-tag', group).forEach((tag) => {
        const match = !query || tag.textContent.toLowerCase().includes(query);
        tag.hidden = !match;
        if (match) visibleInGroup++;
      });
      group.hidden = visibleInGroup === 0;
      visible += visibleInGroup;
    });

    status.textContent = query ? `${visible} dari ${tags.length} skill cocok` : `${tags.length} skill tercatat`;
    empty.hidden = visible > 0;
  }

  input.addEventListener('input', debounce(apply, 120));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      input.value = '';
      apply();
    }
  });
  apply();
}

/* ========================================================================
   5. Filter proyek
   ======================================================================== */
function initProjectFilter() {
  const bar = $('#project-filter');
  if (!bar) return;

  const cards = $$('#content-proyek [data-kategori]');
  const status = $('#project-status');

  bar.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    const filter = chip.dataset.filter;
    $$('.filter-chip', bar).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));

    let shown = 0;
    cards.forEach((card) => {
      const match = filter === 'all' || card.dataset.kategori === filter;
      card.hidden = !match;
      if (match) shown++;
    });
    status.textContent = `Menampilkan ${shown} dari ${cards.length} quest`;
  });
}

/* ========================================================================
   6. Form kontak
   ======================================================================== */
function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  const MAX_MESSAGE = 300;
  const DRAFT_KEY = 'porto-contact-draft';
  const status = $('#cf-status');
  const counter = $('#cf-count');

  const rules = {
    nama: (v) => (v.length >= 3 ? '' : 'Nama minimal 3 karakter.'),
    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Format email belum benar, contoh: nama@domain.com.',
    pesan: (v) =>
      v.length < 10 ? 'Pesan minimal 10 karakter.' : v.length > MAX_MESSAGE ? `Pesan maksimal ${MAX_MESSAGE} karakter.` : '',
  };
  const names = Object.keys(rules);

  function validate(name) {
    const field = form.elements[name];
    const message = rules[name](field.value.trim());
    field.setAttribute('aria-invalid', String(Boolean(message)));
    $(`#cf-${name}-err`).textContent = message;
    return !message;
  }

  function updateCounter() {
    counter.textContent = `${form.elements.pesan.value.length}/${MAX_MESSAGE}`;
  }

  // localStorage bisa gagal (mode privat, diblokir), jadi selalu dibungkus try/catch
  const saveDraft = debounce(() => {
    try {
      const draft = Object.fromEntries(names.map((n) => [n, form.elements[n].value]));
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* abaikan */
    }
  }, 300);

  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
    if (draft) names.forEach((n) => (form.elements[n].value = draft[n] ?? ''));
  } catch {
    /* draft rusak atau storage tidak tersedia */
  }
  updateCounter();

  names.forEach((name) => {
    const field = form.elements[name];
    field.addEventListener('blur', () => validate(name));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(name);
      if (name === 'pesan') updateCounter();
      status.textContent = '';
      saveDraft();
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const results = names.map((name) => [name, validate(name)]);
    const firstInvalid = results.find(([, ok]) => !ok);
    if (firstInvalid) {
      form.elements[firstInvalid[0]].focus();
      status.dataset.state = 'error';
      status.textContent = 'Periksa lagi isian yang ditandai.';
      return;
    }

    // Tujuan diambil dari tautan email yang sudah ada di halaman, jadi tidak ditulis dua kali
    const to = $('a[href^="mailto:"]')?.getAttribute('href').replace('mailto:', '');
    if (!to) {
      status.dataset.state = 'error';
      status.textContent = 'Alamat email tujuan tidak ditemukan.';
      return;
    }

    const nama = form.elements.nama.value.trim();
    const email = form.elements.email.value.trim();
    const pesan = form.elements.pesan.value.trim();
    const subject = encodeURIComponent(`Pesan dari ${nama} lewat portofolio`);
    const body = encodeURIComponent(`Halo, saya ${nama} (${email}).\n\n${pesan}`);

    status.dataset.state = 'ok';
    status.textContent = `Aplikasi email dibuka. Jika tidak muncul, kirim manual ke ${to}.`;
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  });

  form.addEventListener('reset', () => {
    names.forEach((name) => {
      form.elements[name].setAttribute('aria-invalid', 'false');
      $(`#cf-${name}-err`).textContent = '';
    });
    status.textContent = '';
    counter.textContent = `0/${MAX_MESSAGE}`;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* abaikan */
    }
  });
}

/* ========================================================================
   7. Chatbot Katheryne
   ------------------------------------------------------------------------
   Jawaban dibuat dari isi halaman itu sendiri (DOM), jadi selalu konsisten
   dengan CV dan tidak butuh server. Kalau suatu saat kamu punya proxy/API
   yang aman, isi GEMINI_API_KEY dan chat akan memakai Gemini lebih dulu.
   JANGAN commit API key asli ke GitHub: file ini publik di GitHub Pages.
   ======================================================================== */
const GEMINI_API_KEY = '';
const GEMINI_URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`;

function readKnowledge(role) {
  const name = clean($('h1')?.textContent);
  const cards = (id) =>
    $$(`#content-${id} .bg-g-darker`).map((card) => ({
      title: clean($('h3', card)?.textContent),
      label: clean($('p.uppercase', card)?.textContent),
      text: clean($('p:not(.uppercase)', card)?.textContent),
    }));

  return {
    name,
    firstName: name.split(' ')[0] || 'Traveler',
    role,
    campus: clean($('#content-pendidikan h3')?.textContent),
    level: clean($('#content-pendidikan p.text-g-gold')?.textContent),
    eduDesc: clean($('#content-pendidikan p.text-gray-400')?.textContent),
    organisasi: cards('organisasi'),
    proyek: cards('proyek'),
    kontak: cards('kontak'),
    skills: $$('#content-keterampilan .space-y-6 > div').map((group) => ({
      group: clean($('h3', group)?.textContent),
      tags: $$('.skill-tag', group).map((tag) => clean(tag.textContent)),
    })),
  };
}

const withoutElement = (label) => label.replace(/\s*\(.*?\)\s*/g, '').trim();
const timeGreeting = () => {
  const hour = new Date().getHours();
  return hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
};

/** Kata kunci pendek (<4 huruf) dicocokkan utuh, kata panjang dicocokkan sebagai awalan agar "proyeknya" tetap kena. */
function hasKeyword(text, tokens, keyword) {
  if (keyword.includes(' ') || keyword.length >= 4) return text.includes(keyword);
  return tokens.includes(keyword);
}

const INTENTS = [
  { id: 'salam', words: ['halo', 'hai', 'hi', 'hallo', 'salam', 'selamat', 'ad astra'] },
  { id: 'terima-kasih', words: ['terima kasih', 'makasih', 'thanks', 'thank you'] },
  { id: 'pendidikan', section: 'pendidikan', words: ['kuliah', 'kampus', 'universitas', 'pendidikan', 'ipk', 'jurusan', 'prodi', 'sekolah', 'belajar', 'akademi'] },
  { id: 'organisasi', section: 'organisasi', words: ['organisasi', 'ekskul', 'ekstrakurikuler', 'robot', 'pengalaman', 'guild', 'komunitas'] },
  { id: 'skill', section: 'keterampilan', words: ['skill', 'keahlian', 'keterampilan', 'kemampuan', 'teknologi', 'tools', 'bahasa pemrograman', 'menguasai', 'bisa apa', 'bisa'] },
  { id: 'proyek', section: 'proyek', words: ['proyek', 'project', 'quest', 'karya', 'portofolio', 'portfolio', 'aplikasi', 'flipplay', 'jejak', 'smart monitor'] },
  { id: 'kontak', section: 'kontak', words: ['kontak', 'email', 'github', 'hubungi', 'lokasi', 'domisili', 'alamat', 'tinggal', 'malang', 'dimana', 'di mana', 'sosmed'] },
  { id: 'profil', section: 'profil', words: ['siapa', 'profil', 'tentang', 'perkenalan', 'kenalan', 'nama'] },
];

function answer(userText, k) {
  const text = userText.toLowerCase().replace(/[^a-z0-9+# ]+/g, ' ');
  const tokens = text.split(/\s+/).filter(Boolean);

  // Skill tertentu disebut (mis. "python")? Jawab spesifik dari data tag di halaman.
  const mentioned = k.skills
    .flatMap((g) => g.tags.map((tag) => ({ tag, group: withoutElement(g.group) })))
    .find(({ tag }) => new RegExp(`(^|[^a-z0-9+#])${escapeRegExp(tag.toLowerCase())}($|[^a-z0-9+#])`).test(text));
  if (mentioned) {
    const usedIn = k.proyek.filter((p) => `${p.title} ${p.text}`.toLowerCase().includes(mentioned.tag.toLowerCase()));
    let reply = `Betul, ${mentioned.tag} tercatat di kategori ${mentioned.group} milik ${k.firstName}.`;
    if (usedIn.length) reply += `\nDipakai juga di quest: ${usedIn.map((p) => p.title).join(', ')}.`;
    return { text: reply, section: 'keterampilan' };
  }

  // Proyek tertentu disebut? Beri detailnya.
  const generic = ['landing', 'aplikasi', 'mobile', 'page'];
  const project = k.proyek.find((p) =>
    p.title
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 5 && !generic.includes(w))
      .some((w) => text.includes(w)),
  );
  if (project) {
    return { text: `${project.title} (${project.label}):\n${project.text}`, section: 'proyek' };
  }

  // Pilih intent dengan kecocokan kata kunci terbanyak
  let best = null;
  let bestScore = 0;
  for (const intent of INTENTS) {
    const score = intent.words.filter((w) => hasKeyword(text, tokens, w)).length;
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }

  switch (best?.id) {
    case 'salam':
      return {
        text: `${timeGreeting()}, Traveler! Ad astra abyssosque! Saya Katheryne. Tanyakan soal pendidikan, keterampilan, proyek, atau kontak ${k.firstName}.`,
      };
    case 'terima-kasih':
      return { text: 'Sama-sama, Traveler! Semoga petualanganmu di Teyvat menyenangkan.' };
    case 'pendidikan':
      return { text: `${k.firstName} menimba ilmu di ${k.campus} (${k.level}).\n${k.eduDesc}`, section: best.section };
    case 'organisasi':
      return {
        text:
          `Catatan Guild Activities ${k.firstName}:\n` +
          k.organisasi.map((o) => `• ${o.title} (${o.label}): ${o.text}`).join('\n'),
        section: best.section,
      };
    case 'skill':
      return {
        text:
          `Elemen dan talenta ${k.firstName}:\n` +
          k.skills.map((g) => `• ${withoutElement(g.group)}: ${g.tags.join(', ')}`).join('\n'),
        section: best.section,
      };
    case 'proyek':
      return {
        text:
          `Riwayat quest ${k.firstName}:\n` +
          k.proyek.map((p) => `• ${p.title} (${p.label})`).join('\n') +
          '\nSebut nama quest-nya untuk melihat detail.',
        section: best.section,
      };
    case 'kontak':
      return { text: k.kontak.map((c) => `• ${c.label}: ${c.text}`).join('\n'), section: best.section };
    case 'profil': {
      const region = k.kontak.find((c) => /region/i.test(c.label))?.text;
      const focus = k.skills.map((g) => withoutElement(g.group)).filter((g) => !/soft/i.test(g));
      return {
        text:
          `${k.name} adalah ${k.role.toLowerCase()}${region ? ` dari ${region}` : ''}.` +
          (focus.length ? `\nBidang yang digeluti: ${focus.join(', ')}.` : ''),
        section: best.section,
      };
    }
    default:
      return {
        text: `Hmm, arsip Guild belum mencatat itu, Traveler. Coba tanyakan pendidikan, keterampilan, proyek, organisasi, atau kontak ${k.firstName}.`,
      };
  }
}

function buildSystemPrompt(k) {
  return `Kamu adalah Katheryne, resepsionis Adventurers' Guild dari Genshin Impact, yang menjaga website portofolio Traveler bernama ${k.name}.
Jawab pertanyaan pengunjung tentang ${k.firstName} dalam bahasa Indonesia yang sopan dan ramah, selipkan istilah Genshin Impact secara natural, maksimal 2 paragraf pendek.
Hanya gunakan data berikut, jangan mengarang. Jika diminta hal di luar data atau di luar topik, arahkan kembali ke portofolio.

Peran: ${k.role}
Pendidikan: ${k.campus}, ${k.level}. ${k.eduDesc}
Organisasi: ${k.organisasi.map((o) => `${o.title} (${o.label}): ${o.text}`).join(' | ')}
Keterampilan: ${k.skills.map((g) => `${g.group}: ${g.tags.join(', ')}`).join(' | ')}
Proyek: ${k.proyek.map((p) => `${p.title} (${p.label}): ${p.text}`).join(' | ')}
Kontak: ${k.kontak.map((c) => `${c.label}: ${c.text}`).join(' | ')}`;
}

async function askGemini(history, systemPrompt) {
  const payload = { contents: history, systemInstruction: { parts: [{ text: systemPrompt }] } };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(GEMINI_URL(GEMINI_API_KEY), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Respons kosong');
      return text;
    } catch (error) {
      if (attempt === 3) throw error;
      await wait(2 ** attempt * 1000); // exponential backoff: 2s, 4s
    }
  }
}

function initChat({ nav, role }) {
  const toggleBtn = $('#chat-toggle-btn');
  const windowEl = $('#chat-window');
  const closeBtn = $('#close-chat');
  const input = $('#chat-input');
  const sendBtn = $('#send-btn');
  const messages = $('#chat-messages');
  const typing = $('#typing-indicator');
  const chips = $('#chat-chips');
  if (!toggleBtn || !windowEl) return;

  const sectionLabel = (id) => clean($(`.menu-item[data-target="${id}"] span`)?.textContent) || id;
  const geminiHistory = [];
  let isOpen = false;
  let busy = false;

  messages.setAttribute('aria-live', 'polite');
  windowEl.setAttribute('role', 'dialog');
  windowEl.setAttribute('aria-label', 'Chat dengan Katheryne');
  toggleBtn.setAttribute('aria-expanded', 'false');

  function setOpen(open) {
    isOpen = open;
    windowEl.classList.toggle('open', open);
    toggleBtn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => input.focus(), 300);
    else toggleBtn.focus();
  }

  // textContent/createTextNode (bukan innerHTML) supaya teks pengguna tidak bisa menyisipkan HTML
  function addMessage(text, isUser, section) {
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${isUser ? 'msg-user' : 'msg-ai'}`;
    text.split('\n').forEach((line, i) => {
      if (i) bubble.append(document.createElement('br'));
      bubble.append(document.createTextNode(line));
    });

    if (section && nav) {
      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'chat-action';
      action.textContent = `Buka bagian ${sectionLabel(section)}`;
      action.addEventListener('click', () => nav.show(section));
      bubble.append(action);
    }

    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  async function getReply(userText) {
    const knowledge = readKnowledge(role);
    if (GEMINI_API_KEY) {
      try {
        geminiHistory.push({ role: 'user', parts: [{ text: userText }] });
        const text = await askGemini(geminiHistory, buildSystemPrompt(knowledge));
        geminiHistory.push({ role: 'model', parts: [{ text }] });
        return { text };
      } catch {
        geminiHistory.pop();
        // jatuh ke jawaban lokal di bawah
      }
    }
    return answer(userText, knowledge);
  }

  async function send(rawText) {
    const text = clean(rawText ?? input.value);
    if (!text || busy) return;

    busy = true;
    input.value = '';
    input.disabled = true;
    sendBtn.style.opacity = '0.5';
    addMessage(text, true);
    typing.style.display = 'block';

    const [reply] = await Promise.all([getReply(text), wait(reducedMotion ? 0 : 450 + Math.random() * 450)]);

    typing.style.display = 'none';
    addMessage(reply.text, false, reply.section);
    input.disabled = false;
    sendBtn.style.opacity = '1';
    input.focus();
    busy = false;
  }

  // Tombol pertanyaan cepat
  if (chips) {
    const quick = [
      ['Pendidikan', 'Ceritakan pendidikannya'],
      ['Keterampilan', 'Apa saja keterampilannya?'],
      ['Proyek', 'Apa saja proyeknya?'],
      ['Kontak', 'Bagaimana cara menghubunginya?'],
    ];
    quick.forEach(([label, question]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chat-chip';
      chip.textContent = label;
      chip.addEventListener('click', () => send(question));
      chips.append(chip);
    });
  }

  toggleBtn.addEventListener('click', () => setOpen(!isOpen));
  closeBtn.addEventListener('click', () => setOpen(false));
  sendBtn.addEventListener('click', () => send());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) setOpen(false);
  });
}

/* ========================================================================
   Start
   ======================================================================== */
function run(name, fn) {
  try {
    return fn();
  } catch (error) {
    // Satu fitur gagal tidak boleh mematikan fitur lain
    console.error(`[porto] ${name} gagal dijalankan:`, error);
  }
}

function init() {
  const nav = run('navigasi', initNavigation);
  const role = clean($('#typewriter')?.textContent); // ambil sebelum efek mengetik mengubahnya
  run('latar belakang', initBackground);
  run('typewriter', initTypewriter);
  run('pencarian skill', initSkillSearch);
  run('filter proyek', initProjectFilter);
  run('form kontak', initContactForm);
  run('chat', () => initChat({ nav, role }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
