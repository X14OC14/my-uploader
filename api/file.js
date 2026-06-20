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

        // SOLUSI FIX: Tentukan nama folder Telegram secara dinamis berdasarkan ekstensi file
        let telegramFolder = 'documents';
        if (filename.endsWith('.mp4') || filename.endsWith('.gif')) {
            // Video pendek tanpa suara otomatis dikelompokkan ke animations oleh Telegram
            telegramFolder = 'animations'; 
        }

        // Jalur url sekarang fleksibel mengikuti jenis berkasnya
        const telegramFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${telegramFolder}/file_${filename}`;

        const response = await axios({
            method: 'get',
            url: telegramFileUrl,
            responseType: 'stream'
        });

        let contentType = response.headers['content-type'] || 'application/octet-stream';
        
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.webp')) contentType = 'image/webp';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';
        else if (filename.endsWith('.mp4')) contentType = 'video/mp4';
        else if (filename.endsWith('.mp3')) contentType = 'audio/mpeg';

        res.removeHeader('Content-Disposition'); 
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline'); 
        
        response.data.pipe(res);

    } catch (err) {
        return res.status(404).json({ 
            status: false, 
            message: 'File tidak ditemukan atau link sudah kedaluwarsa.' 
        });
    }
};
