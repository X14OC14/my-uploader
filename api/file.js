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

        let response;
        
        // JIKA USER MENGAKSES FORMAT VIDEO/ANIMASI, LAKUKAN CHECKING BERLAPIS
        if (filename.endsWith('.mp4') || filename.endsWith('.gif')) {
            try {
                // 1. Coba cari di folder 'documents' dulu (Asumsi ini video bersuara/durasi panjang)
                response = await axios({
                    method: 'get',
                    url: `https://api.telegram.org/file/bot${BOT_TOKEN}/documents/file_${filename}`,
                    responseType: 'stream'
                });
            } catch (err) {
                // 2. Kalau di 'documents' tidak ada, berarti video bisu/loop. Cari di folder 'animations'
                response = await axios({
                    method: 'get',
                    url: `https://api.telegram.org/file/bot${BOT_TOKEN}/animations/file_${filename}`,
                    responseType: 'stream'
                });
            }
        } else {
            // Untuk file gambar atau audio lainnya, langsung tembak ke folder documents resmi Telegram
            response = await axios({
                method: 'get',
                url: `https://api.telegram.org/file/bot${BOT_TOKEN}/documents/file_${filename}`,
                responseType: 'stream'
            });
        }

        // Penentuan Content-Type secara dinamis mengikuti ekstensi file yang diakses pada URL
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
