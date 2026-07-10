import { SERVER_BASE_URL } from './apiClient';
import Helpers from './helpers';

export async function generateShareImage({ imageUrl, name, price, category }) {
  const canvas = document.createElement('canvas');
  canvas.width  = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1080, 1080);

  if (imageUrl) {
    try {
      let finalUrl = Helpers.resolveMediaUrl(imageUrl);
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;
      const img = await loadImage(finalUrl);
      const targetH = 756;
      const scale   = Math.min(1080 / img.width, targetH / img.height);
      const w = img.width  * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (1080 - w) / 2, 0, w, h);
    } catch (e) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 1080, 756);
    }
  } else {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 1080, 756);
  }

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 756, 1080, 324);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 540, 840);

  ctx.font = '36px sans-serif';
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(category.toUpperCase(), 540, 900);

  ctx.font = 'bold 64px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`$ ${Number(price).toLocaleString('es-CO')}`, 540, 990);

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}