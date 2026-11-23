import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const loader = document.querySelector('[data-testid="loader"]');
const empty = document.querySelector('[data-testid="empty"]');
const panel = document.querySelector('[data-testid="incident-panel"]');
const REFRESH_MS = 2000; // R4

const acked = new Set();
const byId = new Map(); // incident id -> { incident, li }; rows are kept, never rebuilt
let openId = null; // the incident the panel names

// R5: viewer's locale and time zone (en-GB/de-DE put the day first, en-US the month).
const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' });

function el(tag, attrs, text) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
}

const when = (i) => el('time', { datetime: i.openedAt, title: i.openedAt }, fmt.format(new Date(i.openedAt)));
const ackedMark = () => el('span', { 'data-testid': 'acked', class: 'acked' }, 'Acked');

function row(i) {
  const li = el('li', { 'data-testid': 'incident-row', 'data-id': i.id, class: `row ${i.severity}`, tabindex: '0' });
  li.append(
    el('span', { class: 'id' }, i.id),
    el('span', { class: 'sev' }, i.severity),
    el('span', { class: 'what' }, `${i.service} · ${i.region} · ${i.summary}`),
    when(i),
    el('span', { class: 'state' }),
  );
  return li;
}

// R1: new incidents go in at the top; rows already on the board stay as they are.
function render(incidents) {
  const ids = new Set(incidents.map((i) => i.id));
  for (const [id, { li }] of byId) if (!ids.has(id)) (li.remove(), byId.delete(id));
  incidents.forEach((i, n) => {
    if (!byId.has(i.id)) byId.set(i.id, { incident: i, li: row(i) });
    const { li } = byId.get(i.id);
    if (list.children[n] !== li) list.insertBefore(li, list.children[n] ?? null);
  });
  empty.hidden = incidents.length > 0;
  if (openId && !byId.has(openId)) closePanel();
}

// R2 (product, after step 1): a row opens its incident panel; Ack lives in the panel and acks the incident
// the panel names, so a row moving under the pointer can no longer ack the wrong incident.
function openPanel(id) {
  const { incident: i } = byId.get(id);
  const opened = el('p', {}, 'Opened ');
  opened.append(when(i));
  openId = id;
  for (const { li } of byId.values()) li.classList.toggle('open', li.dataset.id === id);
  panel.replaceChildren(
    el('h2', {}, i.id),
    el('p', { class: 'sev' }, i.severity),
    el('p', {}, `${i.service} · ${i.region}`),
    el('p', {}, i.summary),
    opened,
    acked.has(id) ? ackedMark() : el('button', { 'data-testid': 'panel-ack', type: 'button' }, `Ack ${i.id}`),
    el('button', { 'data-testid': 'panel-close', type: 'button', class: 'close' }, 'Close'),
  );
  panel.hidden = false;
}

function closePanel() {
  openId = null;
  panel.hidden = true;
  for (const { li } of byId.values()) li.classList.remove('open');
}

async function refresh() {
  try {
    render((await fetchIncidents()).incidents);
    loader.remove(); // R3
  } catch (err) {
    console.error(err);
  }
}

list.addEventListener('click', (e) => {
  const li = e.target.closest('[data-testid="incident-row"]');
  if (li) openPanel(li.dataset.id);
});
list.addEventListener('keydown', (e) => {
  const li = e.target.closest('[data-testid="incident-row"]');
  if (li && (e.key === 'Enter' || e.key === ' ')) (e.preventDefault(), openPanel(li.dataset.id));
});

panel.addEventListener('click', async (e) => {
  if (e.target.closest('[data-testid="panel-close"]')) return closePanel();
  const btn = e.target.closest('[data-testid="panel-ack"]');
  if (!btn) return;
  const id = openId;
  btn.disabled = true;
  try {
    await ack(id);
    acked.add(id);
    byId.get(id)?.li.querySelector('.state').replaceChildren(ackedMark());
    if (openId === id) openPanel(id);
  } catch (err) {
    console.error(err);
    btn.disabled = false;
  }
});

await refresh();
setInterval(refresh, REFRESH_MS);
