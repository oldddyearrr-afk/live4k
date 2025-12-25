const express = require('express');
const { spawn } = require('child_process');
const compression = require('compression');
const app = express();

// تفعيل الضغط لتقليل استهلاك الباندويث بنسبة 30% إضافية
app.use(compression());

// رابط البث الأساسي الثابت
const MASTER_STREAM_URL = "https://next.badinan.xyz/nexttv/LDSPORTHD/playlist.m3u8";

app.get('/watch', (req, res) => {
    // إعدادات تجعل المشغل يعامل الرابط كبث فضائي مباشر
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // إعداد محرك FFmpeg الخارق للنت الضعيف جداً
    const ffmpeg = spawn('ffmpeg', [
        '-reconnect', '1', 
        '-reconnect_streamed', '1', 
        '-reconnect_delay_max', '4',
        '-err_detect', 'ignore_err', // تجاهل الأخطاء البسيطة لضمان عدم توقف البث
        '-i', MASTER_STREAM_URL,
        
        // --- إعدادات السرعة والنت الضعيف ---
        '-c', 'copy',                // نسخ الفيديو (بدون ضغط CPU) لضمان سرعة الاستجابة
        '-f', 'mpegts',              // تحويل لصيغة TS (الأفضل للنت الضعيف لأنها Streamable)
        '-fifo_size', '500000',      // ذاكرة مؤقتة داخلية ضخمة لمنع التقطيع
        '-fflags', 'nobuffer+genpts+flush_packets', 
        '-flags', 'low_delay',       // وضع "التأخير المنخفض"
        '-max_delay', '100000',      // تقليل وقت الاستجابة لأقصى حد
        
        // إخراج النتيجة فوراً
        'pipe:1'
    ]);

    // ضخ البيانات مباشرة
    ffmpeg.stdout.pipe(res);

    // تنظيف العمليات عند الخروج
    req.on('close', () => {
        ffmpeg.kill('SIGKILL');
    });

    ffmpeg.on('error', (err) => {
        console.error('FFmpeg Error');
    });
});

app.get('/', (req, res) => res.send("Ultra Fast Stream Server is Ready!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Maximum Performance Active'));
