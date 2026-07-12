import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3004;
const SERVER_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(cors());
app.use(express.json());

// ═══ AI 解读 (SSE 流式) ═══
app.post('/api/interpret', async (req, res) => {
  try {
    const { prompt, apiKey } = req.body;
    const KEY = apiKey || SERVER_API_KEY;
    if (!KEY) return res.status(503).json({ error: '未配置 API Key，请在客户端设置或配置服务端 .env' });

    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是精通紫微斗数的命理大师。专业、准确、有深度地解读命盘。' },
          { role: 'user', content: prompt || '请解读此紫微斗数命盘' }
        ],
        temperature: 0.7, max_tokens: 3000, stream: true
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ error: err.error?.message || `DeepSeek HTTP ${resp.status}` });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
          try {
            const j = JSON.parse(data);
            const c = j.choices?.[0]?.delta?.content;
            if (c) res.write(`data: ${JSON.stringify({ delta: { text: c } })}\n\n`);
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ═══ 静态文件 ═══
app.use(express.static(__dirname));

// ═══ SPA 回退 ═══
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => console.log(`天枢·紫微: http://localhost:${PORT}`));
