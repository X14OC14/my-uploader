const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

module.exports = async (req, res) => {
    // Jalankan CORS
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

        // Kita tempelkan kembali 'file_' sebelum meminta data ke server Telegram
        const telegramFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/documents/file_${filename}`;

        // Ambil file dari Telegram
        const response = await axios({
            method: 'get',
            url: telegramFileUrl,
            responseType: 'stream'
        });

        // 1. Deteksi otomatis Content-Type berdasarkan ekstensi file-nya
        let contentType = response.headers['content-type'] || 'application/octet-stream';
        
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (filename.endsWith('.png')) contentType = 'image/png';
        else if (filename.endsWith('.webp')) contentType = 'image/webp';
        else if (filename.endsWith('.gif')) contentType = 'image/gif';
        else if (filename.endsWith('.mp4')) contentType = 'video/mp4';
        else if (filename.endsWith('.mp3')) contentType = 'audio/mpeg';

        // 2. BERSIHKAN HEADER LAMA & SET HEADER BARU YANG MURNI
        res.removeHeader('Content-Disposition'); // Hapus paksaan download dari Telegram
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', 'inline'); // Paksa tampil di browser
        
        // Alirkan data biner mentahnya saja
        response.data.pipe(res);

    } catch (err) {
        return res.status(404).json({ 
            status: false, 
            message: 'File tidak ditemukan atau link sudah kedaluwarsa.' 
        });
    }
};
