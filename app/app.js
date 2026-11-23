import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const REFRESH_MS = 2000; // R4

const acked = new Set();
let incidents = [];
let shown = ''; // what the list shows now; skip re-renders that change nothing

// R5: viewer's locale and time zone (en-GB/de-DE put the day first, en-US the month).
const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

function el(tag, attrs, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

function row(i) {
  const li = el('li', { 'data-testid': 'incident-row', 'data-id': i.id, class: `row ${i.severity}` });
  li.append(
    el('span', { class: 'id' }, i.id),
    el('span', { class: 'sev' }, i.severity),
    el('span', { class: 'what' }, `${i.service} · ${i.region} · ${i.summary}`),
    el('time', { datetime: i.openedAt, title: i.openedAt }, fmt.format(new Date(i.openedAt))),
    acked.has(i.id)
      ? el('span', { 'data-testid': 'acked', class: 'acked' }, 'Acked')
      : el('button', { 'data-testid': 'ack', type: 'button' }, 'Ack'),
  );
  return li;
}

function render() {
  const key = JSON.stringify([incidents.map((i) => i.id), [...acked]]);
  if (key === shown) return;
  shown = key;
  list.replaceChildren(...incidents.map(row)); // R1: API order, newest first
  empty.hidden = incidents.length > 0;
}

async function refresh() {
  try {
    incidents = (await fetchIncidents()).incidents;
    loader.remove(); // R3
    render();
  } catch (err) {
    console.error(err);
  }
}

// R2
list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-testid="ack"]');
  if (!btn) return;
  const id = btn.closest('[data-testid="incident-row"]').dataset.id;
  btn.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    render();
  } catch (err) {
    console.error(err);
    btn.disabled = false;
  }
});

await refresh();
setInterval(refresh, REFRESH_MS);
