const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const compression = require('compression');
const app = express();

// إعدادات التشفير الثابتة
const SECRET_KEY = "GoalX_Ultra_Fast_2025_Safe"; 
const ALGORITHM = 'aes-256-cbc';

// 1. تفعيل أقوى مستويات الضغط (Gzip/Brotli) لتقليل حجم البيانات المنقولة
app.use(compression({ level: 9 })); // المستوى 9 هو الأقوى للضغط

// وظيفة التشفير
function encrypt(url) {
    const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(JSON.stringify({url: url, ts: Date.now()}), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const payload = {
        iv: iv.toString('base64'),
        value: encrypted,
        mac: crypto.createHmac('sha256', key).update(iv.toString('base64') + encrypted).digest('hex')
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// وظيفة فك التشفير
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

// الرابط الأول: لتوليد الرابط المشفر (استخدمه من المتصفح)
app.get('/gen', (req, res) => {
    const urlToEncrypt = req.query.url;
    if (!urlToEncrypt) return res.send("أدخل الرابط هكذا: /gen?url=رابط_البث");
    const encrypted = encrypt(urlToEncrypt);
    const finalLink = `https://${req.get('host')}/live?data=${encrypted}`;
    res.send(`رابط المشاهدة المضغوط والمشفر:<br><br><input style='width:80%' value='${finalLink}'>`);
});

// الرابط الثاني: البث الفعلي (أقصى ضغط وتمرير سريع)
app.get('/live', async (req, res) => {
    const streamUrl = decrypt(req.query.data);
    if (!streamUrl) return res.status(403).send('Forbidden');

    try {
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Encoding': 'gzip, deflate, br', // طلب ضغط من المصدر أيضاً
                'Connection': 'keep-alive'
            },
            timeout: 15000 
        });

        // إرسال Headers لتقليل الـ Buffering في المشغل
        res.set({
            'Content-Type': response.headers['content-type'],
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Accel-Buffering': 'no' // يخبر Render بعدم تخزين البيانات مؤقتاً وتمريرها فوراً
        });

        // تمرير البيانات لحظياً (Direct Piping)
        response.data.pipe(res);

    } catch (e) {
        res.status(500).send('Stream Error');
    }
});

app.get('/', (req, res) => res.send("Goal-X Server Active"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Ready'));
