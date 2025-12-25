const express = require('express');
const { spawn } = require('child_process');
const crypto = require('crypto');
const compression = require('compression');
const app = express();

const SECRET_KEY = "GoalX_Fixed_Key_2025_Ultra"; 
const ALGORITHM = 'aes-256-cbc';

// تفعيل الضغط لتقليل حجم البيانات (Headers & Playlists)
app.use(compression());

// وظائف التشفير وفك التشفير
function encrypt(url) {
    const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(JSON.stringify({url: url}), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return Buffer.from(JSON.stringify({iv: iv.toString('base64'), value: encrypted})).toString('base64');
}

function decrypt(token) {
    try {
        const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        const iv = Buffer.from(payload.iv, 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(payload.value, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted).url;
    } catch (e) { return null; }
}

// رابط توليد الروابط (استخدمه من المتصفح)
app.get('/gen', (req, res) => {
    const url = req.query.url;
    if (!url) return res.send("أضف الرابط: /gen?url=رابط_البث");
    const encrypted = encrypt(url);
    const finalLink = `https://${req.get('host')}/live?data=${encodeURIComponent(encrypted)}`;
    res.send(`<h3>رابط المشاهدة المعتمد على FFmpeg:</h3><textarea style='width:90%;height:70px;'>${finalLink}</textarea>`);
});

// رابط البث باستخدام محرك FFmpeg
app.get('/live', (req, res) => {
    const streamUrl = decrypt(req.query.data);
    if (!streamUrl) return res.status(403).send('Forbidden');

    // إعدادات البث للنت الضعيف
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // تشغيل FFmpeg كممرر ذكي
    // يقوم بمعالجة حزم الفيديو لضمان عدم التقطيع
    const ffmpeg = spawn('ffmpeg', [
        '-re',                       // القراءة بالسرعة الحقيقية للبث
        '-i', streamUrl,             // المصدر
        '-c', 'copy',                // نسخ البيانات بدون استهلاك CPU عالي (أسرع للـ Render)
        '-map', '0',                 // جلب كل المسارات (صوت وصورة)
        '-f', 'mpegts',              // تحويل لصيغة خفيفة جداً للنت الضعيف
        '-metadata', 'service_provider=GoalX',
        '-fflags', 'nobuffer+genpts', // منع التخزين المؤقت وتصحيح التوقيت
        'pipe:1'                     // إخراج النتيجة فوراً للمشغل
    ]);

    ffmpeg.stdout.pipe(res);

    // إيقاف FFmpeg عند إغلاق المشغل لتوفير موارد السيرفر
    req.on('close', () => {
        ffmpeg.kill('SIGINT');
    });

    ffmpeg.on('error', (err) => {
        console.error('FFmpeg Error:', err);
    });
});

app.get('/', (req, res) => res.send("FFmpeg Streamer Active"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server Ready on port ' + PORT));
