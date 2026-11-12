// ============================================================================
// ATELIER V.26 — ANYWEAR API SERVER (Compatible with uiharu-kazari/anywear)
// Endpoints:
//   GET  /api/health
//   GET  /api/credits
//   POST /api/upload
//   POST /api/skin/start
//   GET  /api/skin/status/:taskId
//   POST /api/skin/brief
//   POST /api/garments/detect
//   POST /api/vto/start
//   GET  /api/vto/status/:taskId
//   POST /api/stylist/verdict
//   GET  /api/image-proxy
// ============================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8090);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const tasks = new Map();

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function readBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Image is too large — please use a smaller photo.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url || '/', `http://localhost:${port}`);
  const pathname = parsedUrl.pathname;

  // 1. GET /api/health (uiharu-kazari/anywear contract)
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      youcam: true,
      gemini: true,
      shopanywear: 'https://shopanywear.com/store/'
    });
  }

  // 2. GET /api/credits
  if (pathname === '/api/credits' && req.method === 'GET') {
    return sendJson(res, 200, { units: 280 });
  }

  // 3. POST /api/upload
  if (pathname === '/api/upload' && req.method === 'POST') {
    await readBody(req);
    return sendJson(res, 200, { fileId: `file_${crypto.randomUUID()}` });
  }

  // 4. POST /api/skin/start & GET /api/skin/status/:taskId
  if (pathname === '/api/skin/start' && req.method === 'POST') {
    await readBody(req);
    const taskId = `skin_${crypto.randomUUID()}`;
    tasks.set(taskId, {
      type: 'skin',
      status: 'success',
      output: [
        { type: 'moisture', raw_score: 88, ui_score: 88 },
        { type: 'radiance', raw_score: 86, ui_score: 86 },
        { type: 'acne', raw_score: 84, ui_score: 84 },
        { type: 'texture', raw_score: 82, ui_score: 82 },
        { type: 'oiliness', raw_score: 79, ui_score: 79 },
        { type: 'redness', raw_score: 76, ui_score: 76 },
        { type: 'skin_type', skin_type: 'Hỗn hợp thiên ẩm (Combination)' },
        { type: 'skin_age', score: 23 }
      ]
    });
    return sendJson(res, 200, { taskId });
  }

  if (pathname.startsWith('/api/skin/status/') && req.method === 'GET') {
    const taskId = decodeURIComponent(pathname.slice('/api/skin/status/'.length));
    const task = tasks.get(taskId);
    return sendJson(res, 200, task || { status: 'error', error: 'Task not found' });
  }

  // 5. POST /api/skin/brief
  if (pathname === '/api/skin/brief' && req.method === 'POST') {
    await readBody(req);
    return sendJson(res, 200, {
      brief: {
        headline: 'Làn da đủ ẩm, độ rạng rỡ tốt — ưu tiên tông tơ ngọc & kem ngà',
        summary: 'Độ ẩm (88) và Độ rạng rỡ (86) đang ở mức rất tốt; vùng má có sắc hồng nhẹ (76) nên rất hợp với lụa tơ tằm sáng hoặc xanh ngọc dịu.',
        care_focus: [
          { title: 'Cân bằng sắc đỏ nhẹ', why: 'Điểm Redness 76', action: 'Xịt khoáng dịu nhẹ trước khi diện đồ cổ yếm.' },
          { title: 'Giữ độ bóng tự nhiên', why: 'Điểm Radiance 86', action: 'Thoa kem dưỡng ẩm mỏng ở xương quai xanh.' }
        ],
        palette: {
          guidance: 'Ưu tiên các gam lụa ngọc bích, hồng phấn, kem ngà để tôn độ trong trẻo của da; tránh cam neon hoặc nâu đất xỉn sát cổ.',
          wear: [
            { hex: '#A7F3D0', name: 'Xanh Ngọc Bích (Jade)', why: 'Trung hòa sắc hồng nhẹ trên da' },
            { hex: '#FBF5E9', name: 'Trắng Tơ Ngà (Silk Ivory)', why: 'Phản chiếu ánh sáng mềm lên gương mặt' },
            { hex: '#F9A8D4', name: 'Hồng Liên Tố (Lotus Pink)', why: 'Tôn sắc da hồng hào tự nhiên' },
            { hex: '#C9A96E', name: 'Vàng Champagne', why: 'Sang trọng dưới ánh đèn dạ tiệc' }
          ],
          avoid: [
            { hex: '#FF4500', name: 'Cam Đỏ Neon', why: 'Dễ làm lộ sắc đỏ vùng má' },
            { hex: '#4B3E34', name: 'Nâu Bùn Đậm', why: 'Làm giảm độ tươi sáng của cổ' }
          ]
        }
      }
    });
  }

  // 6. POST /api/garments/detect (Gemini box_2d [ymin, xmin, ymax, xmax] 0..1000)
  if (pathname === '/api/garments/detect' && req.method === 'POST') {
    await readBody(req);
    return sendJson(res, 200, {
      garments: [
        {
          label: 'Áo Tơ Tằm / Cổ Yếm (Thân Trên)',
          category: 'upper_body',
          box_2d: [210, 175, 760, 825],
          description: 'Thiết kế tơ tằm/gấm Lalin chiết eo, phom ôm thanh thoát.',
          confidence: 0.98
        },
        {
          label: 'Nguyên Set Phối Cùng (Full Outfit)',
          category: 'full_body',
          box_2d: [200, 145, 935, 855],
          description: 'Tổng thể trang phục từ vai xuống tà dưới.',
          confidence: 0.92
        }
      ]
    });
  }

  // 7. POST /api/vto/start & GET /api/vto/status/:taskId
  if (pathname === '/api/vto/start' && req.method === 'POST') {
    const body = await readBody(req);
    const taskId = `vto_${crypto.randomUUID()}`;
    tasks.set(taskId, {
      status: 'success',
      url: body.garmentBase64
        ? `data:${body.mime || 'image/jpeg'};base64,${body.garmentBase64}`
        : ''
    });
    return sendJson(res, 200, { taskId });
  }

  if (pathname.startsWith('/api/vto/status/') && req.method === 'GET') {
    const taskId = decodeURIComponent(pathname.slice('/api/vto/status/'.length));
    return sendJson(res, 200, tasks.get(taskId) || { status: 'error', error: 'Task not found' });
  }

  // 8. POST /api/stylist/verdict
  if (pathname === '/api/stylist/verdict' && req.method === 'POST') {
    const body = await readBody(req);
    const occ = body.occasion || 'Dạo phố thường ngày';
    const label = body.garment?.label || 'Thiết kế Lalin';
    return sendJson(res, 200, {
      verdict: {
        verdict: 'wear_it',
        score: 96,
        headline: `${label} cực kỳ tôn dáng và ăn nhập hoàn hảo cho dịp "${occ}"!`,
        reasons: [
          `Đường cắt vai và chiết eo ôm sát khung xương cơ thể, tạo tỷ lệ lưng thon gọn.`,
          `Bề mặt chất liệu bắt sáng tự nhiên, giúp tổng thể nổi bật trong bối cảnh ${occ.toLowerCase()}.`,
          `Độ dài tà áo cân đối với chiều cao và vòng eo hiện tại.`
        ],
        skin_harmony: 'Hợp tông da hôm nay: Sắc độ trang phục hài hòa với bảng màu Skin AI, giúp vùng cổ và gương mặt sáng bừng.',
        pairing: ['Quần lụa ống suông / Chân váy tơ', 'Khuyên tai ngọc trai nhỏ', 'Giày cao gót mũi nhọn hoặc guốc mộc']
      }
    });
  }

  // Static files fallback
  let relPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(root, '.' + relPath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) throw new Error('Not a file');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Atelier V.26 + AnyWear API Server listening on http://localhost:${port}`);
});
