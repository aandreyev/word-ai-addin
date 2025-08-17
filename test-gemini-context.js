/*
Progressive probe to find an approximate max input acceptance for the configured Gemini model.
Run this under Doppler so GEMINI_API_KEY is injected:
  doppler run --project mswordai --config dev -- node test-gemini-context.js
*/

const fetch = global.fetch || (() => {
  try { return require('node-fetch'); } catch (e) { return null; }
})();

if (!fetch) {
  console.error('node fetch not available. On Node >=18 fetch is global; otherwise install node-fetch.');
  process.exit(2);
}

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('GEMINI_API_KEY missing. Run under doppler.');
  process.exit(2);
}

const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;

// Try payloads with increasing character counts; keep response small to preserve budget.
async function tryChars(n) {
  const bodyText = 'A'.repeat(n);
  const payload = {
    contents: [{ parts: [{ text: bodyText }] }],
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, text: txt.slice(0, 2000) };
    }
    try {
      const json = JSON.parse(txt);
      return { ok: true, json };
    } catch (e) {
      return { ok: false, status: 'invalid-json', text: txt.slice(0, 2000) };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

(async () => {
  console.log('Model:', model);
  const steps = [20000, 40000, 80000, 160000];
  for (const n of steps) {
    process.stdout.write(`Trying ${n} chars... `);
    const r = await tryChars(n);
    if (r.ok) {
      console.log('OK');
    } else {
      console.log('FAILED ->', r.status || r.error);
      if (r.text) {
        console.log('Response snippet:', r.text.slice(0, 500));
      }
      break;
    }
    await new Promise(s => setTimeout(s, 800));
  }
  console.log('Probe complete. If you hit a failure, re-run with smaller steps around that size to pinpoint the limit.');
})();
