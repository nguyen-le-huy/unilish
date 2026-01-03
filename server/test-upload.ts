import axios from 'axios';
import FormData from 'form-data';
import { env } from './src/config/env.js'; // Ensure env is loaded if needed, but we hit localhost

const API_URL = `http://localhost:${env.PORT}/api`;

async function test() {
    console.log(`Target API: ${API_URL}`);
    try {
        // 1. Authenticate
        let token = '';
        const email = `test.uploader.${Date.now()}@example.com`;
        const password = 'Password123!';

        console.log('1. Authenticating via Clerk Sync (Bypass OTP)...');
        try {
            const result = await axios.post(`${API_URL}/auth/sync-clerk`, {
                clerkId: `test_clerk_${Date.now()}`,
                email,
                fullName: 'Test Uploader',
                avatarUrl: 'https://example.com/avatar.png'
            });
            token = result.data.data.token;
            console.log('   ✅ Authenticated successfully');
        } catch (error: any) {
            console.error('   ❌ Auth failed:', error.response?.data || error.message);
            return;
        }

        // 2. Upload Image
        console.log('\n2. Testing Image Upload (Cloudinary)...');
        try {
            const form = new FormData();
            // 1x1 GIF Base64
            const imageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            form.append('file', imageBuffer, { filename: 'test.gif', contentType: 'image/gif' });

            const resImg = await axios.post(`${API_URL}/upload`, form, {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('   ✅ Image Upload Success:', resImg.data);
        } catch (error: any) {
            console.error('   ❌ Image Upload Failed:', error.response?.data?.message || error.message);
            if (error.response?.status === 500) {
                console.log('      (Likely due to missing Cloudinary credentials in .env)');
            }
        }

        // 3. Upload Audio
        console.log('\n3. Testing Audio Upload (R2)...');
        try {
            const form2 = new FormData();
            // Tiny MP3 Base64
            const audioBuffer = Buffer.from('//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//NExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq', 'base64');
            form2.append('file', audioBuffer, { filename: 'test.mp3', contentType: 'audio/mpeg' });

            const resAudio = await axios.post(`${API_URL}/upload`, form2, {
                headers: {
                    ...form2.getHeaders(),
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('   ✅ Audio Upload Success:', resAudio.data);
        } catch (error: any) {
            console.error('   ❌ Audio Upload Failed:', error.response?.data?.message || error.message);
            if (error.response?.status === 500) {
                console.log('      (Likely due to missing R2 credentials in .env)');
            }
        }

    } catch (error: any) {
        console.error('Unexpected Error:', error);
    }
}

test();
