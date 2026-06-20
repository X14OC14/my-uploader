const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const SECRET_API_KEY = process.env.API_KEY_KU;

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method Not Allowed' });

    try {
        await runMiddleware(req, res, upload);

        const { apikey } = req.body;
        const file = req.file;

        if (!apikey || apikey !== SECRET_API_KEY) {
            return res.status(403).json({ status: false, message: 'API Key salah atau tidak disertakan!' });
        }

        if (!file) {
            return res.status(400).json({ status: false, message: 'Mana filenya? Field form-data harus bernama "file".' });
        }

        const formToTelegram = new FormData();
        formToTelegram.append('chat_id', CHANNEL_ID);
        formToTelegram.append('document', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype
        });

        const tgResponse = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, 
            formToTelegram, 
            { headers: formToTelegram.getHeaders() }
        );

        const fileId = tgResponse.data.result.document.file_id;

        const tgFileUrlResponse = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const filePath = tgFileUrlResponse.data.result.file_path; // contoh: documents/file_13.jpg atau animations/file_13.mp4

        // 6. SOLUSI FIX: Ambil murni nama filenya saja, buang folder apa pun di depannya secara otomatis
        const rawFileName = filePath.split('/').pop(); // Mengambil "file_13.jpg" atau "file_13.mp4"
        const cleanFileName = rawFileName.replace('file_', ''); // Menjadi "13.jpg" atau "13.mp4"

        const customUrl = `https://${req.headers.host}/file/${cleanFileName}`;

        return res.status(200).json({
            status: true,
            creator: "Xiaocia",
            result: {
                url: customUrl,
                name: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            }
        });

    } catch (err) {
        return res.status(500).json({ 
            status: false, 
            message: err.response?.data?.description || err.message 
        });
    }
};
