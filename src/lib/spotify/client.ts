/**
 * Spotify API Client
 * Uses Client Credentials flow for server-side access
 */

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  track_number: number;
  preview_url: string | null;
  external_ids?: {
    isrc?: string;
  };
  artists: Array<{
    id: string;
    name: string;
  }>;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  tracks: {
    items: SpotifyTrack[];
    total: number;
    next: string | null;
  };
}

let cachedToken: SpotifyToken | null = null;

/**
 * Get Spotify access token using Client Credentials flow
 */
export async function getSpotifyToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires_at && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.statusText}`);
  }

  const token: SpotifyToken = await response.json();

  // Cache the token with expiry time (subtract 60 seconds for safety margin)
  cachedToken = {
    ...token,
    expires_at: Date.now() + (token.expires_in - 60) * 1000,
  };

  return token.access_token;
}

/**
 * Fetch album details including tracks from Spotify
 */
export async function getSpotifyAlbum(albumId: string): Promise<SpotifyAlbum> {
  const token = await getSpotifyToken();

  const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Album not found: ${albumId}`);
    }
    throw new Error(`Failed to fetch album: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all tracks from an album (handles pagination)
 */
export async function getSpotifyAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const tracks: SpotifyTrack[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tracks: ${response.statusText}`);
    }

    const data: { items: SpotifyTrack[]; next: string | null } = await response.json();
    tracks.push(...data.items);
    nextUrl = data.next;
  }

  return tracks;
}

/**
 * Extract Spotify album ID from URL
 */
export function extractSpotifyAlbumId(url: string): string | null {
  // Handle various Spotify URL formats
  // https://open.spotify.com/album/5qe4qJH2y5Hu1pXZsBdDIN
  // https://open.spotify.com/intl-fr/album/5qe4qJH2y5Hu1pXZsBdDIN
  // spotify:album:5qe4qJH2y5Hu1pXZsBdDIN

  const patterns = [
    /spotify\.com\/(?:intl-[a-z]+\/)?album\/([a-zA-Z0-9]+)/,
    /spotify:album:([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate waveform data from audio analysis (simplified version)
 * In production, you would use Spotify's Audio Analysis API or process actual audio
 */
export function generateWaveformData(trackDuration: number, seed: number): number[] {
  const points = 100;
  const waveform: number[] = [];

  // Seeded random for reproducibility
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < points; i++) {
    // Generate waveform-like data with envelope
    const position = i / points;
    const envelope = Math.sin(position * Math.PI); // Fade in/out
    const wave1 = Math.sin(position * 8 * Math.PI) * 0.3;
    const wave2 = Math.sin(position * 12 * Math.PI + seed) * 0.2;
    const noise = (seededRandom(seed + i) - 0.5) * 0.4;

    const value = 0.5 + (envelope * (wave1 + wave2 + noise));
    waveform.push(Math.max(0.1, Math.min(1, value)));
  }

  return waveform;
}

export type { SpotifyTrack, SpotifyAlbum };
