const express = require('express');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const cors = require('cors'); // ✅ To support fetch from JS
const { PassThrough } = require('stream');

const app = express();
const PORT = 3000;

ffmpeg.setFfmpegPath(ffmpegPath);

app.use(cors()); // ✅ Enable CORS for all routes

// ✅ API Endpoint: Get MP3 as Stream (for fetch)
app.get('/api/download-mp3', async (req, res) => {
  try {
    const videoURL = req.query.url;

    if (!ytdl.validateURL(videoURL)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const info = await ytdl.getInfo(videoURL);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').substring(0, 100);

    const audioStream = ytdl(videoURL, { quality: 'highestaudio' });
    const audioPipe = new PassThrough();
    audioStream.pipe(audioPipe);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Filename', `${title}.mp3`); // Optional custom header

    ffmpeg(audioPipe)
      .audioBitrate(128)
      .format('mp3')
      .on('start', (cmd) => console.log('[FFmpeg]', cmd))
      .on('error', (err) => {
        console.error('[FFmpeg error]', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to process audio.' });
        else res.end();
      })
      .on('end', () => console.log('[FFmpeg] MP3 finished'))
      .pipe(res, { end: true });

  } catch (err) {
    console.error('[Server error]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Something went wrong.' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🎧 MP3 API server running at http://localhost:${PORT}`);
});
