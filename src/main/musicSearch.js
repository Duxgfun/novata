/**
 * Module tìm kiếm & trích xuất luồng âm thanh In-App cho Novata
 * Hỗ trợ tìm kiếm từ YouTube Music và trích xuất direct audio stream URL
 * Phát trực tiếp qua HTML5 Audio element với độ trễ cực thấp
 */

const { Ytdl, chooseFormat } = require('@distube/ytdl-core');
const ytdlClient = new Ytdl();

// Bộ nhớ cache tạm thời các URL stream đã lấy để tiết kiệm thời gian và tài nguyên
const streamUrlCache = new Map();

/**
 * Trích xuất đường link audio stream trực tiếp từ ID video YouTube
 */
async function getAudioStreamUrl(videoId) {
  if (!videoId) return null;

  // Kiểm tra cache (hợp lệ trong 30 phút)
  if (streamUrlCache.has(videoId)) {
    const cached = streamUrlCache.get(videoId);
    if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached.url;
    }
  }

  try {
    const info = await ytdlClient.getInfo(videoId);
    // Loc cac format audio truc tiep co URL hop le, khong phai live stream
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

  // Dự phòng: Tìm nguồn Audius nếu YouTube bị chặn
  try {
    const audiusRes = await fetch(`https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(videoId)}&app_name=Novata`);
    const d = await audiusRes.json();
    if (d.data && d.data[0] && d.data[0].id) {
      return `https://api.audius.co/v1/tracks/${d.data[0].id}/stream?app_name=Novata`;
    }
  } catch (e) {}

  return null;
}

/**
 * Tìm kiếm danh sách bài hát từ YouTube Music
 */
async function searchMusic(query) {
  if (!query || !query.trim()) {
    query = 'nhạc việt hay nhất';
  }

  const cleanQuery = query.trim();
  const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(cleanQuery);

  try {
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}`);
    }

    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.*?});/s);

    if (!match) {
      return getFallbackTracks(cleanQuery);
    }

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

    if (results.length === 0) {
      return getFallbackTracks(cleanQuery);
    }

    return results;
  } catch (err) {
    console.error('Lỗi tìm kiếm YouTube Music:', err.message);
    return getFallbackTracks(cleanQuery);
  }
}

/**
 * Làm sạch tiêu đề video
 */
function cleanTitle(raw) {
  return raw
    .replace(/\s*\[(OFFICIAL|Official|MV|Music Video|Lyrics|Audio|HD|4K)[^\]]*\]/gi, '')
    .replace(/\s*\((OFFICIAL|Official|MV|Music Video|Lyrics|Audio|HD|4K)[^)]*\)/gi, '')
    .trim();
}

/**
 * Danh sách bài hát mẫu dự phòng
 */
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
  getAudioStreamUrl
};
