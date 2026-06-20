const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method !== 'GET') {
        return res.status(405).json({ status: false, message: 'Method Not Allowed' });
    }

    try {
        const { filename } = req.query;

        if (!filename) {
            return res.status(400).json({ status: false, message: 'Filename tidak disertakan.' });
        }

        const telegramFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/documents/${filename}`;

        const response = await axios({
            method: 'get',
            url: telegramFileUrl,
            responseType: 'stream'
        });

        // 1. Ambil content type asli (misal: image/png)
        const contentType = response.headers['content-type'];
        res.setHeader('Content-Type', contentType);
        
        // 2. PAKSA HEADER BIAR INLINE (Buka di browser, bukan download otomatis)
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        
        // Alirkan data filenya
        response.data.pipe(res);

    } catch (err) {
        return res.status(404).json({ 
            status: false, 
            message: 'File tidak ditemukan atau link sudah kedaluwarsa.' 
        });
    }
};
