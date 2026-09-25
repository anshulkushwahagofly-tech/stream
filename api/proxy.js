module.exports = async function handler(req, res) {
  // Extract path and query params (Vercel provides req.url relative to deployment)
  const urlPath = req.url || '/';
  const steamUrl = 'https://store.steampowered.com' + urlPath;

  try {
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
    };

    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie;
    }

    let bodyData = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'object') {
        bodyData = JSON.stringify(req.body);
        headers['Content-Type'] = 'application/json';
      } else {
        bodyData = req.body;
      }
    }

    const response = await fetch(steamUrl, {
      method: req.method,
      headers: headers,
      body: bodyData,
      redirect: 'manual'
    });

    const contentType = response.headers.get('content-type') || '';
    const myDomain = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        const newLocation = location.replace('https://store.steampowered.com', myDomain);
        res.setHeader('Location', newLocation);
        return res.status(response.status).end();
      }
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie.replace(/domain=\.steampowered\.com;/gi, '')); 
    }

    if (contentType.includes('text/html')) {
      let html = await response.text();
      html = html.replace(/https:\/\/store\.steampowered\.com/g, myDomain);
      html = html.replace(/https:\\\/\\\/store\.steampowered\.com/g, myDomain.replace(/\//g, '\\/'));
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(html);
    } 
    
    if (contentType.includes('application/json')) {
        let text = await response.text();
        text = text.replace(/https:\/\/store\.steampowered\.com/g, myDomain);
        text = text.replace(/https:\\\/\\\/store\.steampowered\.com/g, myDomain.replace(/\//g, '\\/'));
        res.setHeader('Content-Type', contentType);
        return res.status(response.status).send(text);
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).send('Live Proxy Error: ' + error.message);
  }
}
