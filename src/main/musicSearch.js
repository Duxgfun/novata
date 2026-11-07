
let ytdlModule = null;
let ytdlClientInstance = null;

function getYtdlClient() {
  if (!ytdlClientInstance) {
    if (!ytdlModule) {
      ytdlModule = require('@distube/ytdl-core');
    }
    ytdlClientInstance = new ytdlModule.Ytdl();
  }
  return { client: ytdlClientInstance, chooseFormat: ytdlModule.chooseFormat };
}

const streamUrlCache = new Map();

const lyricsCache = new Map();

async function getAudioStreamUrl(videoId) {
  if (!videoId) return null;

  if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
    if (/\.(mp3|m4a|wav|ogg|aac|flac)(\?.*)?$/i.test(videoId)) {
      return videoId;
    }
    const ytMatch = videoId.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      videoId = ytMatch[1];
    }
  }

  if (streamUrlCache.has(videoId)) {
    const cached = streamUrlCache.get(videoId);
    if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached.url;
    }
  }

  try {
    const { client, chooseFormat } = getYtdlClient();
    const info = await client.getInfo(videoId);
    const audioFormats = (info.formats || []).filter(f => f.hasAudio && f.url && !f.isLive);
    audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
    const format = audioFormats[0] || chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: { hasAudio: true }
    });

    if (format && format.url) {
      streamUrlCache.set(videoId, {
        url: format.url,
        timestamp: Date.now()
      });
      return format.url;
    }
  } catch (err) {
    console.error(`Không thể lấy direct audio stream cho video ${videoId}:`, err.message);
  }

  try {
    const audiusRes = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(videoId)}&app_name=Novata`);
    const d = await audiusRes.json();
    if (d.data && d.data[0] && d.data[0].id) {
      return `https://api.audius.co/v1/tracks/${d.data[0].id}/stream?app_name=Novata`;
    }
  } catch (e) {}

  return null;
}

function isMediaUrl(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    /^(www\.)?(open\.spotify\.com|music\.youtube\.com|youtube\.com|youtu\.be|soundcloud\.com|on\.soundcloud\.com|music\.apple\.com|itunes\.apple\.com)/i.test(trimmed)
  );
}

async function resolveMediaUrl(urlRaw) {
  if (!urlRaw) return null;
  let url = urlRaw.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const videoId = ytMatch[1];
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        signal: AbortSignal.timeout(6000)
      });
      if (oembedRes.ok) {
        const oeData = await oembedRes.json();
        return {
          id: videoId,
          title: cleanTitle(oeData.title || 'YouTube Track'),
          artist: (oeData.author_name || 'YouTube Creator').trim(),
          duration: '3:45',
          thumbnail: oeData.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          source: url.includes('music.youtube.com') ? 'YouTube Music' : 'YouTube',
          isDirectLink: true,
          originalUrl: url
        };
      }
    } catch (e) {}

    return {
      id: videoId,
      title: 'YouTube Track ' + videoId,
      artist: 'YouTube',
      duration: '3:30',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      source: 'YouTube Music',
      isDirectLink: true,
      originalUrl: url
    };
  }

  const spotMatch = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  if (spotMatch) {
    try {
      const trackId = spotMatch[1];
      const embedRes = await fetch(`https://open.spotify.com/embed/track/${trackId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(6000)
      });

      let title = '';
      let artist = 'Spotify Artist';
      let thumb = '';
      let durationStr = '3:30';

      if (embedRes.ok) {
        const html = await embedRes.text();
        const jsonMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            const entity = parsed?.props?.pageProps?.state?.data?.entity;
            if (entity) {
              title = entity.name || '';
              if (Array.isArray(entity.artists) && entity.artists.length > 0) {
                artist = entity.artists.map(a => a.name).join(', ');
              }
              if (entity.coverArt?.sources?.length > 0) {
                thumb = entity.coverArt.sources[0].url;
              }
              if (entity.duration) {
                const totalSec = Math.floor(entity.duration / 1000);
                const m = Math.floor(totalSec / 60);
                const s = totalSec % 60;
                durationStr = `${m}:${s < 10 ? '0' : ''}${s}`;
              }
            }
          } catch (e) {}
        }
      }

      if (!title) {
        const oeRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (oeRes.ok) {
          const oeData = await oeRes.json();
          title = oeData.title || '';
          thumb = oeData.thumbnail_url || '';
        }
      }

      if (title) {
        const ytMatchResults = await searchMusicInternal(`${artist} ${title} audio`);
        const matchedTrack = ytMatchResults.length > 0 ? ytMatchResults[0] : null;

        return {
          id: matchedTrack ? matchedTrack.id : 'spot_' + trackId,
          title: cleanTitle(title),
          artist: artist,
          duration: matchedTrack ? matchedTrack.duration : durationStr,
          thumbnail: thumb || (matchedTrack ? matchedTrack.thumbnail : ''),
          source: 'Spotify',
          isDirectLink: true,
          originalUrl: url
        };
      }
    } catch (err) {
      console.warn('Lỗi phân tích link Spotify:', err.message);
    }
  }

  const scMatch = url.match(/soundcloud\.com\/([^/]+)\/([^/?&#]+)/) || url.match(/on\.soundcloud\.com\/([a-zA-Z0-9]+)/);
  if (scMatch) {
    try {
      const oembedRes = await fetch(`https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
        signal: AbortSignal.timeout(6000)
      });
      if (oembedRes.ok) {
        const oeData = await oembedRes.json();
        let rawTitle = oeData.title || 'SoundCloud Track';
        let author = oeData.author_name || 'SoundCloud Artist';

        rawTitle = rawTitle.replace(new RegExp(`\\s+by\\s+${author}$`, 'i'), '').trim();

        const ytMatchResults = await searchMusicInternal(`${author} ${rawTitle} audio`);
        const matchedTrack = ytMatchResults.length > 0 ? ytMatchResults[0] : null;

        return {
          id: matchedTrack ? matchedTrack.id : 'sc_' + Date.now(),
          title: cleanTitle(rawTitle),
          artist: author,
          duration: matchedTrack ? matchedTrack.duration : '3:30',
          thumbnail: oeData.thumbnail_url || (matchedTrack ? matchedTrack.thumbnail : ''),
          source: 'SoundCloud',
          isDirectLink: true,
          originalUrl: url
        };
      }
    } catch (err) {
      console.warn('Lỗi phân tích link SoundCloud:', err.message);
    }
  }

  if (url.includes('apple.com') || url.includes('itunes.apple.com')) {
    try {
      const trackParamMatch = url.match(/[?&]i=(\d+)/);
      const fallbackIdMatch = url.match(/\/id(\d+)/) || url.match(/\/(\d+)(?:\?|$)/);
      const trackId = trackParamMatch ? trackParamMatch[1] : (fallbackIdMatch ? fallbackIdMatch[1] : '');
      if (trackId) {
        const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${trackId}`, {
          signal: AbortSignal.timeout(6000)
        });
        if (itunesRes.ok) {
          const itData = await itunesRes.json();
          if (itData.results && itData.results.length > 0) {
            const item = itData.results[0];
            const title = item.trackName || item.collectionName || 'Apple Music Track';
            const artist = item.artistName || 'Apple Music Artist';
            const thumb = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb');
            const durSec = item.trackTimeMillis ? Math.floor(item.trackTimeMillis / 1000) : 210;
            const mins = Math.floor(durSec / 60);
            const secs = durSec % 60;
            const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

            const ytMatchResults = await searchMusicInternal(`${artist} ${title} audio`);
            const matchedTrack = ytMatchResults.length > 0 ? ytMatchResults[0] : null;

            return {
              id: matchedTrack ? matchedTrack.id : 'apple_' + trackId,
              title: cleanTitle(title),
              artist: artist,
              duration: durStr,
              thumbnail: thumb || (matchedTrack ? matchedTrack.thumbnail : ''),
              source: 'Apple Music',
              isDirectLink: true,
              originalUrl: url
            };
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi phân tích link Apple Music:', err.message);
    }
  }

  if (/\.(mp3|m4a|wav|ogg|aac|flac)(\?.*)?$/i.test(url)) {
    const filename = url.split('/').pop().split('?')[0];
    const decodedName = decodeURIComponent(filename).replace(/\.[^/.]+$/, '');
    return {
      id: url,
      title: decodedName || 'Direct Audio Stream',
      artist: 'Direct Stream',
      duration: 'Live',
      thumbnail: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/sound.svg',
      source: 'Direct Stream',
      isDirectLink: true,
      originalUrl: url
    };
  }

  return null;
}

async function searchMusicInternal(cleanQuery) {
  const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(cleanQuery);
  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.*?});/s);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const results = [];

    for (const sec of sections) {
      const items = sec.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const vr = item.videoRenderer;
        if (vr && vr.videoId && vr.title?.runs?.[0]?.text) {
          const title = vr.title.runs.map(r => r.text).join('').trim();
          const author = (vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || 'Nghệ sĩ').trim();
          const duration = vr.lengthText?.simpleText || '3:30';
          const thumbs = vr.thumbnail?.thumbnails || [];
          const thumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : '';

          results.push({
            id: vr.videoId,
            title: cleanTitle(title),
            artist: author,
            duration: duration,
            thumbnail: thumb,
            source: 'YouTube Music'
          });
          if (results.length >= 20) break;
        }
      }
      if (results.length >= 20) break;
    }
    return results;
  } catch (e) {
    return [];
  }
}

function parseDurationSec(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function rankMusicResults(results, rawQuery) {
  if (!Array.isArray(results) || results.length === 0) return results;

  const qLower = (rawQuery || '').toLowerCase();
  const wantsVideo = /\b(mv|video|phim|film|short film|karaoke|beat)\b/i.test(qLower);
  const wantsRemix = /\b(remix|nonstop|dj|1 hour|1hour|mashup)\b/i.test(qLower);

  return [...results].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    const durA = parseDurationSec(a.duration);
    const durB = parseDurationSec(b.duration);

    if (!wantsVideo) {
      if (titleA.includes('official audio') || titleA.includes('audio')) scoreA += 40;
      if (titleB.includes('official audio') || titleB.includes('audio')) scoreB += 40;

      if (titleA.includes('official lyric') || titleA.includes('lyrics video') || titleA.includes('lyric video')) scoreA += 30;
      if (titleB.includes('official lyric') || titleB.includes('lyric video') || titleB.includes('lyrics video')) scoreB += 30;

      if (titleA.includes('official music video') || titleA.includes('official mv') || titleA.includes('short film') || titleA.includes('phim ca nhạc')) scoreA -= 25;
      if (titleB.includes('official music video') || titleB.includes('official mv') || titleB.includes('short film') || titleB.includes('phim ca nhạc')) scoreB -= 25;
    }

    if (titleA.includes('speed up') || titleA.includes('nightcore') || titleA.includes('slowed') || titleA.includes('8d audio')) scoreA -= 60;
    if (titleB.includes('speed up') || titleB.includes('nightcore') || titleB.includes('slowed') || titleB.includes('8d audio')) scoreB -= 60;

    if (!wantsRemix) {
      if (durA >= 150 && durA <= 330) scoreA += 25;
      if (durB >= 150 && durB <= 330) scoreB += 25;

      if (durA > 480) scoreA -= 80;
      if (durB > 480) scoreB -= 80;
    }

    return scoreB - scoreA;
  });
}

async function searchMusic(query) {
  if (!query || !query.trim()) {
    query = 'nhạc việt hay nhất';
  }

  const cleanQuery = query.trim();

  if (isMediaUrl(cleanQuery)) {
    const directTrack = await resolveMediaUrl(cleanQuery);
    if (directTrack) {
      return [directTrack];
    }
  }

  const searchResults = await searchMusicInternal(cleanQuery);
  if (searchResults.length > 0) {
    return rankMusicResults(searchResults, cleanQuery);
  }

  return getFallbackTracks(cleanQuery);
}

async function getLyricsForTrack(title, artist, duration = null) {
  if (!title || !title.trim()) {
    return { success: false, error: 'No title provided' };
  }

  const cleanT = cleanTitle(title)
    .replace(/\s*ft\.?.*$/i, '')
    .replace(/\s*feat\.?.*$/i, '')
    .trim();

  const cleanA = (artist || '')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*VEVO$/i, '')
    .replace(/,.*$/, '')
    .trim();

  const cacheKey = `${cleanT}___${cleanA}`.toLowerCase();
  if (lyricsCache.has(cacheKey)) {
    return lyricsCache.get(cacheKey);
  }

  try {
    let queryUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanT)}`;
    if (cleanA && cleanA !== 'YouTube' && cleanA !== 'Spotify Artist') {
      queryUrl += `&artist_name=${encodeURIComponent(cleanA)}`;
    }
    if (duration && typeof duration === 'number' && duration > 0) {
      queryUrl += `&duration=${Math.round(duration)}`;
    }

    let res = await fetch(queryUrl, {
      headers: {
        'User-Agent': 'Novata Music Player (https://github.com/Duxgfun/novata)'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      const result = {
        success: true,
        trackName: data.trackName || cleanT,
        artistName: data.artistName || cleanA,
        syncedLyrics: data.syncedLyrics || null,
        plainLyrics: data.plainLyrics || null,
        isSynced: !!(data.syncedLyrics && data.syncedLyrics.trim())
      };
      lyricsCache.set(cacheKey, result);
      return result;
    }

    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanA ? `${cleanT} ${cleanA}` : cleanT)}`;
    const sRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Novata Music Player (https://github.com/Duxgfun/novata)'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (sRes.ok) {
      const sData = await sRes.json();
      if (Array.isArray(sData) && sData.length > 0) {
        const best = sData.find(item => item.syncedLyrics) || sData[0];
        const result = {
          success: true,
          trackName: best.trackName || cleanT,
          artistName: best.artistName || cleanA,
          syncedLyrics: best.syncedLyrics || null,
          plainLyrics: best.plainLyrics || null,
          isSynced: !!(best.syncedLyrics && best.syncedLyrics.trim())
        };
        lyricsCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi lấy lời bài hát từ LRCLIB:', err.message);
  }

  const notFound = {
    success: false,
    trackName: cleanT,
    artistName: cleanA,
    syncedLyrics: null,
    plainLyrics: null,
    isSynced: false
  };
  lyricsCache.set(cacheKey, notFound);
  return notFound;
}

function cleanTitle(raw) {
  if (!raw) return '';
  return raw
    .replace(/\s*\[(OFFICIAL|Official|MV|Music Video|Lyrics|Audio|HD|4K)[^\]]*\]/gi, '')
    .replace(/\s*\((OFFICIAL|Official|MV|Music Video|Lyrics|Audio|HD|4K)[^)]*\)/gi, '')
    .trim();
}

function getFallbackTracks(query) {
  return [
    {
      id: 'abPmZCZZrFA',
      title: 'Đừng Làm Trái Tim Anh Đau',
      artist: 'Sơn Tùng M-TP',
      duration: '5:26',
      thumbnail: 'https://i.ytimg.com/vi/abPmZCZZrFA/hqdefault.jpg',
      source: 'YouTube Music'
    },
    {
      id: 'GpmOn4RyzZI',
      title: 'Cắt Đôi Nỗi Sầu',
      artist: 'Tăng Duy Tân',
      duration: '3:24',
      thumbnail: 'https://i.ytimg.com/vi/GpmOn4RyzZI/hqdefault.jpg',
      source: 'YouTube Music'
    },
    {
      id: 'sJzF3uG6jZg',
      title: 'Nấu Ăn Cho Em',
      artist: 'Đen Vâu ft. PiaLinh',
      duration: '4:46',
      thumbnail: 'https://i.ytimg.com/vi/sJzF3uG6jZg/hqdefault.jpg',
      source: 'YouTube Music'
    },
    {
      id: 'w4cLw2nB1yE',
      title: 'Ngày Đầu Tiên',
      artist: 'Đức Phúc',
      duration: '4:20',
      thumbnail: 'https://i.ytimg.com/vi/w4cLw2nB1yE/hqdefault.jpg',
      source: 'YouTube Music'
    },
    {
      id: 'z2q2W2w0E50',
      title: 'Bật Tình Yêu Lên',
      artist: 'Tăng Duy Tân x Hòa Minzy',
      duration: '3:45',
      thumbnail: 'https://i.ytimg.com/vi/z2q2W2w0E50/hqdefault.jpg',
      source: 'YouTube Music'
    }
  ];
}

module.exports = {
  searchMusic,
  getAudioStreamUrl,
  resolveMediaUrl,
  getLyricsForTrack
};
