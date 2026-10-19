import { BadRequestException } from '@nestjs/common';

export const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.doc': 'application/msword',
  '.xls': 'application/vnd.ms-excel',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export const SAFE_FILENAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|gif|webp|avif|pdf|mp4|mov|webm|docx?|xlsx?)$/i;

export function validateFileSignature(
  extension: string,
  head: Buffer,
  tail: Buffer,
) {
  const hex = head.subarray(0, 8).toString('hex');
  const text = head.subarray(0, 40).toString('latin1');
  const valid = ['.jpg', '.jpeg'].includes(extension)
    ? hex.startsWith('ffd8ff')
    : extension === '.png'
      ? hex === '89504e470d0a1a0a'
      : extension === '.gif'
        ? /^GIF8[79]a/.test(text)
        : extension === '.webp'
          ? text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP'
          : extension === '.pdf'
            ? text.startsWith('%PDF-')
            : ['.mp4', '.mov'].includes(extension)
              ? text.slice(4, 8) === 'ftyp'
              : extension === '.avif'
                ? text.slice(4, 8) === 'ftyp' && /avif|avis/.test(text.slice(8))
                : extension === '.webm'
                  ? hex.startsWith('1a45dfa3')
                  : ['.doc', '.xls'].includes(extension)
                    ? hex === 'd0cf11e0a1b11ae1'
                    : ['.docx', '.xlsx'].includes(extension)
                      ? hex.startsWith('504b0304') &&
                        tail.includes(
                          Buffer.from(
                            extension === '.docx'
                              ? 'word/document.xml'
                              : 'xl/workbook.xml',
                          ),
                        )
                      : false;
  if (!valid)
    throw new BadRequestException(
      'Isi file tidak sesuai format yang diizinkan',
    );
}
