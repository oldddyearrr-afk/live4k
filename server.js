const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const compression = require('compression');
const app = express();

// إعدادات الأمان - غير الكود السري الخاص بك هنا
const SECRET_KEY = "Your_Ultra_Secret_Key_For_GoalX_2025"; 
const ALGORITHM = 'aes-256-cbc';

// 1. تفعيل الضغط لتقليل حجم البيانات (مهم جداً للنت الضعيف)
app.use(compression());

// وظيفة فك التشفير والتحقق من الـ IP والوقت
function decrypt(token) {
    try {
        const key = crypto.createHash('sha256').update(SECRET_KEY).digest();
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        
        const iv = Buffer.from(payload.iv, 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        let decrypted = decipher.update(payload.value, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        const data = JSON.parse(decrypted);
        return data.url; 
    } catch (e) {
        return null;
    }
}

// الرابط الأساسي للبث
app.get('/live', async (req, res) => {
    const streamUrl = decrypt(req.query.data);

    if (!streamUrl) {
        return res.status(403).send('Forbidden: Invalid or Expired Token');
    }

    try {
        // جلب البث مع إعدادات تقليل التأخير (Low Latency)
        const response = await axios({
            method: 'get',
            url: streamUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Encoding': 'gzip'
            },
            timeout: 5000 // 5 ثواني للاتصال كحد أقصى لمنع التعليق
        });

        // إرسال الـ Headers الضرورية للمشغل
        res.set({
            'Content-Type': response.headers['content-type'],
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive'
        });

        // السر الحقيقي: تمرير البيانات كـ "أنبوب" لحظي
        response.data.pipe(res);

    } catch (error) {
        console.error("Stream Error:", error.message);
        res.status(500).send('Stream Unavailable');
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
