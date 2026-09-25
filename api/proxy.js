export default async function handler(req, res) {
  // Extract path and query params (Vercel provides req.url relative to deployment)
  const urlPath = req.url || '/';
  const steamUrl = 'https://store.steampowered.com' + urlPath;

  try {
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
    };

    // Forward cookies if available
    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie;
    }

    const response = await fetch(steamUrl, {
      method: req.method,
      headers: headers,
      // If it's a POST/PUT request, forward the body
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'manual' // Handle redirects manually to rewrite them
    });

    const contentType = response.headers.get('content-type') || '';
    const myDomain = \`\${req.headers['x-forwarded-proto'] || 'https'}://\${req.headers.host}\`;

    // 1. Handle Redirects (e.g., Steam redirecting to /agecheck)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Rewrite location header if it goes to Steam
        const newLocation = location.replace('https://store.steampowered.com', myDomain);
        res.setHeader('Location', newLocation);
        return res.status(response.status).end();
      }
    }

    // Forward Set-Cookie headers so login/cart might work (though cross-domain cookies might be tricky)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie.replace(/domain=\.steampowered\.com;/gi, '')); 
    }

    // 2. Handle HTML rewriting
    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      // Rewrite all store.steampowered.com links to our Vercel domain
      html = html.replace(/https:\/\/store\.steampowered\.com/g, myDomain);
      // Also rewrite escaped versions used in JS
      html = html.replace(/https:\\\/\\\/store\.steampowered\.com/g, myDomain.replace(/\\//g, '\\/'));

      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(html);
    } 
    
    // 3. Handle JSON/API responses
    if (contentType.includes('application/json')) {
        let text = await response.text();
        text = text.replace(/https:\/\/store\.steampowered\.com/g, myDomain);
        text = text.replace(/https:\\\/\\\/store\.steampowered\.com/g, myDomain.replace(/\\//g, '\\/'));
        res.setHeader('Content-Type', contentType);
        return res.status(response.status).send(text);
    }

    // 4. Handle all other assets (images, fonts, binary, etc.)
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).send('Live Proxy Error: ' + error.message);
  }
}
