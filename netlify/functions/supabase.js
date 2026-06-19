// netlify/functions/supabase.js
// Proxies Supabase REST API requests from the browser.
// Env vars required in Netlify → Site config → Environment variables:
//   SUPABASE_URL      e.g. https://abcdefgh.supabase.co
//   SUPABASE_ANON_KEY e.g. eyJhbGciOiJIUzI1NiIs...

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      statusCode: 503,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars' })
    };
  }

  let req;
  try { req = JSON.parse(event.body || '{}'); }
  catch (_) {
    return { statusCode: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { method = 'GET', table, filter, body: sbBody, prefer } = req;

  if (!table) {
    return { statusCode: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing table name' }) };
  }

  let url = `${SUPABASE_URL}/rest/v1/${table}`;
  if (filter) url += '?' + filter;

  const headers = {
    'Content-Type':  'application/json',
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  };

  if (prefer) headers['Prefer'] = prefer;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: ['GET', 'HEAD', 'DELETE'].includes(method)
        ? undefined
        : JSON.stringify(sbBody),
    });
  } catch (err) {
    return {
      statusCode: 503,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Network error reaching Supabase: ' + err.message })
    };
  }

  let responseBody;
  try { responseBody = await res.text(); } catch (_) { responseBody = ''; }

  return {
    statusCode: res.status,
    headers: {
      ...CORS,
      'Content-Type': res.headers.get('content-type') || 'application/json',
    },
    body: responseBody,
  };
};
