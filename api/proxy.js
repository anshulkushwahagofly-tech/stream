module.exports = async function handler(req, res) {
  // Construct a URL object from req.url
  const reqUrlObj = new URL(req.url, `http://${req.headers.host}`);
  
  // Extract the original path from the reqPath parameter injected by Vercel
  let reqPath = reqUrlObj.searchParams.get('reqPath') || '';
  
  // Clean up our internal parameter before sending to Steam
  reqUrlObj.searchParams.delete('reqPath');
  
  const urlPath = '/' + reqPath + reqUrlObj.search;

  // Determine target domain based on path
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
  } else if (urlPath.startsWith('/about') || urlPath.startsWith('/jobs')) {
    targetDomain = 'https://www.valvesoftware.com';
  } else if (urlPath.startsWith('/partner')) {
    targetDomain = 'https://partner.steamgames.com';
  }

  // Handle case where path is just /partner (we mapped it from partner.steamgames.com)
  let steamUrl = targetDomain + urlPath.replace('/partner', '');
  if (targetDomain === 'https://www.valvesoftware.com') {
      steamUrl = targetDomain + urlPath; // valvesoftware paths map directly
  }
  if (targetDomain === 'https://store.steampowered.com' || targetDomain === 'https://steamcommunity.com' || targetDomain === 'https://help.steampowered.com') {
      steamUrl = targetDomain + urlPath;
  }

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
        location = location.replace(/https?:\/\/steamcommunity\.com/gi, myDomain);
        location = location.replace(/https?:\/\/help\.steampowered\.com/gi, myDomain);
        location = location.replace(/https?:\/\/www\.valvesoftware\.com/gi, myDomain);
        location = location.replace(/https?:\/\/partner\.steamgames\.com/gi, myDomain + '/partner');
        
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

    if (contentType.includes('text/html')) {
      let html = await response.text();
      
      html = html.replace(/https?:\/\/store\.steampowered\.com/gi, myDomain);
      html = html.replace(/https?:\/\/steamcommunity\.com/gi, myDomain);
      html = html.replace(/https?:\/\/help\.steampowered\.com/gi, myDomain);
      html = html.replace(/https?:\/\/www\.valvesoftware\.com/gi, myDomain);
      html = html.replace(/https?:\/\/valvesoftware\.com/gi, myDomain);
      html = html.replace(/https?:\/\/partner\.steamgames\.com/gi, myDomain + '/partner');
      
      html = html.replace(/https?:\\\/\\\/store\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
      html = html.replace(/https?:\\\/\\\/steamcommunity\.com/gi, myDomain.replace(/\//g, '\\/'));
      html = html.replace(/https?:\\\/\\\/help\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
      
      html = html.replace(/store\.steampowered\.com/gi, hostName);
      html = html.replace(/steamcommunity\.com/gi, hostName);
      html = html.replace(/help\.steampowered\.com/gi, hostName);
      
      html = html.replace(/window\.top\.location/gi, "window.self.location");
      
      res.setHeader('Content-Type', contentType);
      return res.status(response.status).send(html);
    } 
    
    if (contentType.includes('application/json') || contentType.includes('application/javascript')) {
        let text = await response.text();
        text = text.replace(/https?:\/\/store\.steampowered\.com/gi, myDomain);
        text = text.replace(/https?:\/\/steamcommunity\.com/gi, myDomain);
        text = text.replace(/https?:\/\/help\.steampowered\.com/gi, myDomain);
        text = text.replace(/https?:\/\/partner\.steamgames\.com/gi, myDomain + '/partner');
        text = text.replace(/https?:\/\/www\.valvesoftware\.com/gi, myDomain);
        
        text = text.replace(/https?:\\\/\\\/store\.steampowered\.com/gi, myDomain.replace(/\//g, '\\/'));
        text = text.replace(/https?:\\\/\\\/steamcommunity\.com/gi, myDomain.replace(/\//g, '\\/'));
        
        text = text.replace(/store\.steampowered\.com/gi, hostName);
        text = text.replace(/steamcommunity\.com/gi, hostName);
        
        res.setHeader('Content-Type', contentType);
        return res.status(response.status).send(text);
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).send('Live Proxy Error: ' + error.message + ' URL: ' + steamUrl);
  }
}
