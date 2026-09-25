module.exports = async function handler(req, res) {
  const urlPath = req.url || '/';
  const steamUrl = 'https://store.steampowered.com' + urlPath;

  try {
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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
    const hostName = req.headers.host;

    if (response.status >= 300 && response.status < 400) {
      let location = response.headers.get('location');
      if (location) {
        location = location.replace(/https?:\/\/store\.steampowered\.com/gi, myDomain);
        location = location.replace(/store\.steampowered\.com/gi, hostName);
        res.setHeader('Location', location);
        return res.status(response.status).end();
      }
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie.replace(/domain=\.steampowered\.com;/gi, '')); 
    }

    if (contentType.includes('text/html')) {
      let html = await response.text();
      html = html.replace(/https?:\/\/store\.steampowered\.com/gi, myDomain);
      html = html.replace(/https?:\\\/\\\/store\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
      html = html.replace(/store\.steampowered\.com/gi, hostName);
      
      // Attempt to neutralize top-level redirects
      html = html.replace(/window\.top\.location/gi, "window.self.location");
      
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(html);
    } 
    
    if (contentType.includes('application/json')) {
        let text = await response.text();
        text = text.replace(/https?:\/\/store\.steampowered\.com/gi, myDomain);
        text = text.replace(/https?:\\\/\\\/store\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
        text = text.replace(/store\.steampowered\.com/gi, hostName);
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
