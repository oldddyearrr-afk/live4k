const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();

const streamDir = path.join(__dirname, 'hls');
if (!fs.existsSync(streamDir)) fs.mkdirSync(streamDir);

const MASTER_STREAM_URL = "https://next.badinan.xyz/nexttv/LDSPORTHD/playlist.m3u8";
let ffmpegProcess = null;

// وظيفة بدء البث
const startStreaming = () => {
    if (ffmpegProcess) return;
    ffmpegProcess = spawn('ffmpeg', [
        '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '2',
        '-i', MASTER_STREAM_URL,
        '-c', 'copy', 
        '-f', 'hls',
        '-hls_time', '1', // قطع مدتها ثانية واحدة للتحميل السريع
        '-hls_list_size', '3',
        '-hls_flags', 'delete_segments+independent_segments',
        '-hls_segment_type', 'mpegts',
        path.join(streamDir, 'index.m3u8')
    ]);
    console.log("محرك البث انطلق...");
};

// الصفحة الرئيسية (المشغل)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Goal-X Ultra Stream</title>
        <link href="https://vjs.zencdn.net/7.20.3/video-js.css" rel="stylesheet" />
        <style>
            body { background: #0f0f0f; color: white; font-family: sans-serif; text-align: center; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: auto; }
            .video-js { width: 100%; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,255,0,0.2); }
            .controls { margin-top: 20px; display: flex; gap: 10px; justify-content: center; }
            button { padding: 12px 25px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.3s; }
            .btn-start { background: #27ae60; color: white; }
            .btn-stop { background: #c0392b; color: white; }
            button:hover { opacity: 0.8; transform: scale(1.05); }
            .status { margin-bottom: 10px; color: #aaa; font-size: 0.9em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🚀 Goal-X Ultra Stream (4K/1080p)</h2>
            <p class="status">وضع التحميل السريع (Low Latency) مفعل</p>
            
            <video id="my-video" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto" data-setup='{}'>
                <source src="/hls/index.m3u8" type="application/x-mpegURL">
            </video>

            <div class="controls">
                <button class="btn-start" onclick="location.href='/start'">تشغيل المحرك</button>
                <button class="btn-stop" onclick="location.href='/stop'">إيقاف السيرفر</button>
            </div>
            <p style="margin-top:20px; color:#555;">رابط البث المباشر للمشغلات الخارجية:<br> <code>https://\${req.get('host')}/hls/index.m3u8</code></p>
        </div>

        <script src="https://vjs.zencdn.net/7.20.3/video.min.js"></script>
    </body>
    </html>
    `);
});

// أوامر التحكم
app.get('/start', (req, res) => {
    startStreaming();
    res.redirect('/');
});

app.get('/stop', (req, res) => {
    if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL');
        ffmpegProcess = null;
        // تنظيف الملفات القديمة
        const files = fs.readdirSync(streamDir);
        for (const file of files) fs.unlinkSync(path.join(streamDir, file));
    }
    res.redirect('/');
});

app.use('/hls', express.static(streamDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server is running...');
    startStreaming(); // يبدأ تلقائياً عند التشغيل
});
