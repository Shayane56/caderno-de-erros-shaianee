/**
 * Prepara imagens coladas/enviadas pela usuária para guardar no banco local:
 * reduz para no máximo `maxSide` pixels e comprime (WebP quando o navegador
 * permite, senão JPEG). Imagens já pequenas são mantidas como estão.
 */
export async function imageFileToDataUrl(file: Blob, maxSide = 1400, quality = 0.86): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem (PNG, JPG, WebP ou GIF).');
  if (file.size > 25 * 1024 * 1024) throw new Error('A imagem é muito grande (máximo de 25 MB).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      image.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não permite processar imagens.');
    // Fundo branco: prints com transparência continuam legíveis em JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const webp = canvas.toDataURL('image/webp', quality);
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Tamanho aproximado (em KB) de uma imagem em data URL. */
export function dataUrlSizeKb(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.round((base64.length * 3) / 4 / 1024);
}
