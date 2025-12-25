const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();

const hlsFolder = path.join(__dirname, 'hls');
if (!fs.existsSync(hlsFolder)) fs.mkdirSync(hlsFolder);

const MASTER_STREAM_URL = "https://next.badinan.xyz/nexttv/LDSPORTHD/playlist.m3u8";
let ffmpegProcess = null;

// وظيفة تشغيل المحرك - إعدادات البث المباشر الاحترافي
function startEngine() {
    if (ffmpegProcess) return;
    
    ffmpegProcess = spawn('ffmpeg', [
        '-reconnect', '1', 
        '-reconnect_streamed', '1', 
        '-reconnect_delay_max', '5',
        '-headers', 'User-Agent: Mozilla/5.0\r\n',
        '-i', MASTER_STREAM_URL,
        
        // --- إعدادات الضغط والنقل السريع (بدون تغيير الجودة) ---
        '-c', 'copy',                 // نسخ الفيديو والصوت كما هما (بدون خسارة دقة)
        '-f', 'hls',
        '-hls_time', '1',             // تقطيع الفيديو لثانية واحدة (سرعة انطلاق خرافية)
        '-hls_list_size', '6',        // الحفاظ على تدفق مستمر ومنع التقطيع
        '-hls_flags', 'delete_segments+independent_segments+discont_start',
        '-hls_segment_type', 'mpegts',
        '-hls_allow_cache', '1',      // السماح بالتخزين المؤقت الذكي
        
        // تحسين الـ Packets لتناسب النت الضعيف (مثل فيسبوك)
        '-fflags', 'nobuffer+genpts+flush_packets',
        '-flush_packets', '1',
        
        '-hls_segment_filename', path.join(hlsFolder, 'chunk%d.ts'),
        path.join(hlsFolder, 'index.m3u8')
    ]);

    console.log("محرك القوة القصوى انطلق...");
}

function stopEngine() {
    if (ffmpegProcess) {
        ffmpegProcess.kill('SIGKILL');
        ffmpegProcess = null;
        const files = fs.readdirSync(hlsFolder);
        for (const file of files) fs.unlinkSync(path.join(hlsFolder, file));
        console.log("توقف المحرك.");
    }
}

// واجهة التحكم البسيطة
app.get('/', (req, res) => {
    res.send(`
    <body style="background:#0a0a0a; color:#00ff00; text-align:center; padding-top:50px; font-family:monospace;">
        <h1 style="color:white;">🚀 GOAL-X ULTIMATE ENGINE</h1>
        <p style="color:#888;">وضع الضغط السريع (Facebook Style) مفعل</p>
        <div style="margin:30px;">
            <button onclick="location.href='/start'" style="padding:20px 40px; background:#222; color:#00ff00; border:2px solid #00ff00; cursor:pointer; font-weight:bold; text-transform:uppercase;">Start Stream</button>
            <button onclick="location.href='/stop'" style="padding:20px 40px; background:#222; color:#ff0000; border:2px solid #ff0000; cursor:pointer; font-weight:bold; text-transform:uppercase; margin-left:15px;">Stop Stream</button>
        </div>
        <p>رابط المشاهدة (m3u8):</p>
        <input readonly value="https://${req.get('host')}/hls/index.m3u8" style="width:80%; background:#111; color:#00ff00; border:1px solid #333; padding:10px; text-align:center;">
    </body>
    `);
});

app.get('/start', (req, res) => { startEngine(); res.redirect('/'); });
app.get('/stop', (req, res) => { stopEngine(); res.redirect('/'); });

app.use('/hls', express.static(hlsFolder));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Ready');
    startEngine(); // تشغيل تلقائي
});
