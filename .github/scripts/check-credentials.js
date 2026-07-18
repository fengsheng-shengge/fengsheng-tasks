const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.AUTOMATION_PAT;
const OWNER = 'fengsheng-shengge';
const REPO = 'fengsheng-tasks';
const ISSUE_NUMBER = 42;

function fetchComments(page = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments?page=${page}&per_page=100`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Node.js Script'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const comments = JSON.parse(data);
          if (comments.length === 0) {
            resolve([]);
          } else {
            fetchComments(page + 1).then(nextComments => {
              resolve([...comments, ...nextComments]);
            }).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function extractCredentials(text) {
  const result = {};

  const accountIdPatterns = [
    /Account\s*ID\s*[:=]\s*([a-f0-9]{32})/i,
    /CLOUDFLARE_ACCOUNT_ID\s*=\s*([a-f0-9]{32})/i,
    /account_id\s*[:=]\s*([a-f0-9]{32})/i,
    /([a-f0-9]{32})/i
  ];

  const apiTokenPatterns = [
    /API\s*Token\s*[:=]\s*(cfut_[a-zA-Z0-9_-]+)/i,
    /CLOUDFLARE_API_TOKEN\s*=\s*(cfut_[a-zA-Z0-9_-]+)/i,
    /api_token\s*[:=]\s*(cfut_[a-zA-Z0-9_-]+)/i,
    /(cfut_[a-zA-Z0-9_-]+)/i
  ];

  for (const pattern of accountIdPatterns) {
    const match = text.match(pattern);
    if (match && match[1].length === 32) {
      result.CLOUDFLARE_ACCOUNT_ID = match[1];
      break;
    }
  }

  for (const pattern of apiTokenPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.CLOUDFLARE_API_TOKEN = match[1];
      break;
    }
  }

  return result;
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.log('ERROR: GITHUB_TOKEN or AUTOMATION_PAT not set');
    process.exit(1);
  }

  try {
    const comments = await fetchComments();
    console.log(`Found ${comments.length} comments`);

    let credentials = {};

    for (const comment of comments) {
      const body = comment.body || '';
      const extracted = extractCredentials(body);

      if (extracted.CLOUDFLARE_ACCOUNT_ID && !credentials.CLOUDFLARE_ACCOUNT_ID) {
        credentials.CLOUDFLARE_ACCOUNT_ID = extracted.CLOUDFLARE_ACCOUNT_ID;
      }
      if (extracted.CLOUDFLARE_API_TOKEN && !credentials.CLOUDFLARE_API_TOKEN) {
        credentials.CLOUDFLARE_API_TOKEN = extracted.CLOUDFLARE_API_TOKEN;
      }

      if (credentials.CLOUDFLARE_ACCOUNT_ID && credentials.CLOUDFLARE_API_TOKEN) {
        break;
      }
    }

    if (credentials.CLOUDFLARE_ACCOUNT_ID && credentials.CLOUDFLARE_API_TOKEN) {
      console.log('::set-output name=CLOUDFLARE_ACCOUNT_ID::' + credentials.CLOUDFLARE_ACCOUNT_ID);
      console.log('::set-output name=CLOUDFLARE_API_TOKEN::' + credentials.CLOUDFLARE_API_TOKEN);
      console.log('::set-output name=FOUND::true');
      console.log('SUCCESS: Credentials found');
      process.exit(0);
    } else {
      console.log('::set-output name=FOUND::false');
      console.log('WARNING: No credentials found');
      process.exit(0);
    }
  } catch (error) {
    console.log('ERROR:', error.message);
    console.log('::set-output name=FOUND::false');
    process.exit(1);
  }
}

main();