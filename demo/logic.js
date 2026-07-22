const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID';
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-private'
].join(' ');

function getAccessToken() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

function redirectToSpotifyAuth() {
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('show_dialog', 'true');
  window.location.href = authUrl.toString();
}

function loadSpotifySDK() {
  return new Promise((resolve) => {
    if (window.Spotify) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.onload = resolve;
    document.body.appendChild(script);
  });
}

async function initializePlayer(token) {
  await loadSpotifySDK();

  return new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new Spotify.Player({
        name: 'Helmgear Demo Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.8
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('Spotify player ready with device id', device_id);
        resolve({ player, deviceId: device_id });
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.warn('Spotify player went offline', device_id);
      });

      player.addListener('initialization_error', ({ message }) => {
        reject(new Error(message));
      });

      player.addListener('authentication_error', ({ message }) => {
        reject(new Error(message));
      });

      player.connect();
    };
  });
}

async function playUri(token, deviceId, uri) {
  const url = `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`;
  const body = { uris: [uri] };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const info = await response.text();
    throw new Error(`Spotify play request failed: ${response.status} ${info}`);
  }

  console.log('Playback started for', uri);
}

async function startSpotifyPlayback() {
  const token = getAccessToken();
  if (!token) {
    redirectToSpotifyAuth();
    return;
  }

  try {
    const { deviceId } = await initializePlayer(token);
    const trackUri = 'spotify:track:3n3Ppam7vgaVa1iaRUc9Lp';
    await playUri(token, deviceId, trackUri);
  } catch (error) {
    console.error('Spotify playback failed:', error);
  }
}

window.addEventListener('load', startSpotifyPlayback);
