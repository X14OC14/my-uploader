const axios = require('axios');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

module.exports = async (req, res) => {
    // Jalankan CORS biar aman diakses dari mana saja
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method !== 'GET') {
        return res.status(405).json({ status: false, message: 'Method Not Allowed' });
    }

    try {
        // Mengambil nama file dari parameter URL (misal: nama-file.jpg)
        const { filename } = req.query;

        if (!filename) {
            return res.status(400).json({ status: false, message: 'Filename tidak disertakan.' });
        }

        // Re-construct kembali ke path asli Telegram
        // Karena di upload.js kita potong 'documents/', di sini kita kembalikan lagi
        const telegramFileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/documents/${filename}`;

        // Ambil file dari Telegram sebagai stream data
        const response = await axios({
            method: 'get',
            url: telegramFileUrl,
            responseType: 'stream'
        });

        // Teruskan content-type asli dari Telegram ke browser user
        res.setHeader('Content-Type', response.headers['content-type']);
        
        // Alirkan (pipe) data filenya langsung ke user
        response.data.pipe(res);

    } catch (err) {
        return res.status(404).json({ 
            status: false, 
            message: 'File tidak ditemukan atau link sudah kedaluwarsa.' 
        });
    }
};
