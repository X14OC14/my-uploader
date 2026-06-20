const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Ambil data sensitif dari Environment Variables Vercel demi keamanan
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const SECRET_API_KEY = process.env.API_KEY_KU;

// Setel penyimpanan sementara di memori RAM Vercel
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // Batasi maksimal 20MB biar gak timeout
}).single('file');

const runMiddleware = (req, res, fn) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
};

module.exports = async (req, res) => {
    // Pengaturan CORS (Biar API-mu bisa ditembak dari web atau bot mana pun)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });

    try {
        await runMiddleware(req, res, upload);

        const { apikey } = req.body;
        const file = req.file;

        // 1. Validasi API Key buatanmu
        if (!apikey || apikey !== SECRET_API_KEY) {
            return res.status(403).json({ status: false, message: 'API Key salah atau tidak disertakan!' });
        }

        // 2. Validasi file masuk
        if (!file) {
            return res.status(400).json({ status: false, message: 'Mana filenya? Field form-data harus bernama "file".' });
        }

        // 3. Bungkus file lama ke form-data baru buat dioper ke Telegram
        const formToTelegram = new FormData();
        formToTelegram.append('chat_id', CHANNEL_ID);
        formToTelegram.append('document', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        // Tembak ke endpoint sendDocument Telegram
        const tgResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, 
            formToTelegram, 
            { headers: formToTelegram.getHeaders() }
        );

        // 4. Ambil file_id unik dari respon sukses Telegram
        const fileId = tgResponse.data.result.document.file_id;

        // 5. Minta path mentah lokasi file tersebut di server Telegram
        const tgFileUrlResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const filePath = tgFileUrlResponse.data.result.file_path;

        // 6. Racik URL unduhan langsung (Direct Link)
        const directDownloadUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        // Kirim balik respon JSON manis ke client
        return res.status(200).json({
            status: true,
            creator: "Xiaocia",
            result: {
                url: directDownloadUrl,
                name: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }
        });

    } catch (err) {
        // Tangkap error kalau ada masalah (misal token salah atau file kebesaran)
        return res.status(500).json({ 
            status: false, 
            message: err.response?.data?.description || err.message 
        });
    }
};
              
