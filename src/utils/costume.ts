import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createCanvas, Image, loadImage} from 'canvas';
import {CostumeData} from '@models/queries.js';
import config from '#config' with {type: 'json'};
import {getEnableExperimentalFeaturesFromBaid} from "@database/queries/userDiscord.js";
import {
    getMaxPassedDanId,
    getUserAvatarCache,
    upsertUserAvatarCacheQueued,
} from '@database/queries/userData.js';
import logger from '@utils/logger.js';

const width = 463;
const height = 400;
const RENDERER_VERSION = Number(process.env.AVATAR_RENDERER_VERSION ?? 1);
const AVATAR_STATIC_PREFIX = 'avatars/static';
const AVATAR_S3_REGION = process.env.AVATAR_S3_REGION ?? 'us-east-1';
const AVATAR_S3_ENDPOINT = process.env.AVATAR_S3_ENDPOINT;
const AVATAR_S3_BUCKET = process.env.AVATAR_S3_BUCKET;
const AVATAR_S3_ACCESS_KEY_ID = process.env.AVATAR_S3_ACCESS_KEY_ID;
const AVATAR_S3_SECRET_ACCESS_KEY = process.env.AVATAR_S3_SECRET_ACCESS_KEY;

export type AvatarFileType = 'png' | 'webp';
export type AvatarImage = {
    buffer: Buffer;
    filetype: AvatarFileType;
};

type AvatarRenderMode = 'costume' | 'default';
type AvatarRenderRequest = {
    mode: AvatarRenderMode;
    body: number;
    head: number;
    face: number;
    cos: number;
    acce: number;
    bodyColorId: number;
    faceColorId: number;
    rimColorId: number;
    bodyColor: string;
    faceColor: string;
    rimColor: string;
    cosSub?: number;
};

const numberToColourMap: Record<number, string> = {
    0: '#F84828',
    1: '#68C0C0',
    2: '#DC1500',
    3: '#F8F0E0',
    4: '#009687',
    5: '#00BF87',
    6: '#00FF9A',
    7: '#66FFC2',
    8: '#FFFFFF',
    9: '#690000',
    10: '#FF0000',
    11: '#FF6666',
    12: '#FFB3B3',
    13: '#00BCC2',
    14: '#00F7FF',
    15: '#66FAFF',
    16: '#B3FDFF',
    17: '#E4E4E4',
    18: '#993800',
    19: '#FF5E00',
    20: '#FF9E78',
    21: '#FFCFB3',
    22: '#005199',
    23: '#0088FF',
    24: '#66B8FF',
    25: '#B3DBFF',
    26: '#B9B9B9',
    27: '#B37700',
    28: '#FFAA00',
    29: '#FFCC66',
    30: '#FFE2B3',
    31: '#000C80',
    32: '#0019FF',
    33: '#6675FF',
    34: '#B3BAFF',
    35: '#858585',
    36: '#B39B00',
    37: '#FFDD00',
    38: '#FFFF00',
    39: '#FFFF71',
    40: '#2B0080',
    41: '#5500FF',
    42: '#9966FF',
    43: '#CCB3FF',
    44: '#505050',
    45: '#38A100',
    46: '#78C900',
    47: '#B3FF00',
    48: '#DCFF8A',
    49: '#610080',
    50: '#C400FF',
    51: '#DC66FF',
    52: '#EDB3FF',
    53: '#232323',
    54: '#006600',
    55: '#00B800',
    56: '#00FF00',
    57: '#8AFF9E',
    58: '#990059',
    59: '#FF0095',
    60: '#FF66BF',
    61: '#FFB3DF',
    62: '#000000'
};
const padToFourDigits = (num: number) => {
    return num.toString().padStart(4, '0');
};
const applyMaskAndColor = async (mask: Image, color: string) => {
    const offscreenCanvas = createCanvas(width, height);
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // Draw the mask
    offscreenCtx.drawImage(mask, 0, 0);

    // Apply the color
    offscreenCtx.globalCompositeOperation = 'source-in';
    offscreenCtx.fillStyle = color;
    offscreenCtx.fillRect(0, 0, width, height);

    return offscreenCanvas;
};


export async function getAvatar(avatar: CostumeData): Promise<AvatarImage> {
    const experimentalFeaturesEnabled = await getEnableExperimentalFeaturesFromBaid(avatar.baid);
    if (experimentalFeaturesEnabled) {
        try {
            if (!config.checkAvatarCache) {
                return await getAvatarFromAvatarServer(avatar, undefined, 'png');
            }

            return await getAvatarFromCacheOrQueueAnimation(avatar);
        } catch (err) {
            logger.warn({err, baid: avatar.baid}, 'Avatar render failed, falling back to sprite avatar');
            return generateAvatarFromSprite(avatar);
        }
    }

    return generateAvatarFromSprite(avatar);
}

async function getAvatarFromCacheOrQueueAnimation(avatar: CostumeData): Promise<AvatarImage> {
    const request = await createAvatarRenderRequest(avatar);
    const avatarHash = getAvatarHash(avatar.baid, request);
    const staticObjectKey = `${AVATAR_STATIC_PREFIX}/${avatarHash}.png`;
    const cache = await getUserAvatarCache(avatar.baid);

    if (cache?.avatar_hash === avatarHash) {
        if (cache.animated_status === 'ready' && cache.animated_object_key) {
            try {
                return await getAvatarFromS3(cache.animated_object_key);
            } catch (err) {
                logger.warn({err, baid: avatar.baid, objectKey: cache.animated_object_key}, 'Failed to read animated avatar from S3');
            }
        }

        if (cache.static_status === 'ready' && cache.static_object_key) {
            try {
                return await getAvatarFromS3(cache.static_object_key);
            } catch (err) {
                logger.warn({err, baid: avatar.baid, objectKey: cache.static_object_key}, 'Failed to read static avatar from S3');
            }
        }
    }

    const staticAvatar = await getAvatarFromAvatarServer(avatar, request, 'png');
    await putAvatarToS3(staticObjectKey, staticAvatar.buffer, 'image/png');
    await upsertUserAvatarCacheQueued(avatar.baid, avatarHash, staticObjectKey, RENDERER_VERSION);
    return staticAvatar;
}

export async function getAvatarFromAvatarServer(
    avatar: CostumeData,
    request?: AvatarRenderRequest,
    expectedFiletype?: AvatarFileType,
): Promise<AvatarImage> {
    request ??= await createAvatarRenderRequest(avatar);
    const url = new URL('/render', normaliseAvatarServerPath(config.avatarServer));

    url.search = new URLSearchParams({
        mode: request.mode,
        body: request.body.toString(),
        head: request.head.toString(),
        face: request.face.toString(),
        cos: request.cos.toString(),
        acce: request.acce.toString(),
        time: '0.70',
        animName: 'don_combo',
        backgroundTransparent: 'true',
        bodyColor: request.bodyColor,
        faceColor: request.faceColor,
        rimColor: request.rimColor,
        camViewport: '0.25',
        camY: '0.2',
        animationSource: 'don_3d_rf'
    }).toString();

    if (request.cosSub !== undefined) {
        url.searchParams.set('cosSub', request.cosSub.toString());
    }

    const response = await fetch(url);
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!response.ok || (!contentType.includes('image/png') && !contentType.includes('image/webp'))) {
        throw new Error(`Avatar server returned ${response.status} ${response.headers.get('content-type') ?? ''}`.trim());
    }

    const filetype = contentType.includes('image/webp') ? 'webp' : 'png';
    if (expectedFiletype !== undefined && filetype !== expectedFiletype) {
        throw new Error(`Avatar server returned ${filetype}, expected ${expectedFiletype}`);
    }

    return {
        buffer: Buffer.from(await response.arrayBuffer()),
        filetype,
    };
}

async function createAvatarRenderRequest(avatar: CostumeData): Promise<AvatarRenderRequest> {
    const request: AvatarRenderRequest = {
        mode: avatar.current_kigurumi !== 0 ? 'costume' : 'default',
        body: avatar.current_body,
        head: avatar.current_head,
        face: avatar.current_face,
        cos: avatar.current_kigurumi,
        acce: avatar.current_puchi,
        bodyColorId: avatar.color_body,
        faceColorId: avatar.color_face,
        rimColorId: avatar.color_limb,
        bodyColor: numberToColourMap[avatar.color_body] || numberToColourMap[0],
        faceColor: numberToColourMap[avatar.color_face] || numberToColourMap[0],
        rimColor: numberToColourMap[avatar.color_limb] || numberToColourMap[0],
    };

    const DANI_COSTUME_ID = 36;
    const DAN_ID_TO_DANI_COSTUME_SUB_OFFSET = 6;
    if (avatar.current_kigurumi === DANI_COSTUME_ID) {
        request.cosSub = await getMaxPassedDanId(avatar.baid) + DAN_ID_TO_DANI_COSTUME_SUB_OFFSET;
    }

    return request;
}

function getAvatarHash(baid: number, request: AvatarRenderRequest): string {
    const raw = [
        baid,
        request.body,
        request.head,
        request.face,
        request.cos,
        request.acce,
        request.bodyColorId,
        request.faceColorId,
        request.rimColorId,
        RENDERER_VERSION,
    ].join('|');
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

async function getAvatarFromS3(objectKey: string): Promise<AvatarImage> {
    const response = await s3Request('GET', objectKey);
    if (!response.ok) {
        throw new Error(`S3 GET ${objectKey} returned ${response.status}`);
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    return {
        buffer: Buffer.from(await response.arrayBuffer()),
        filetype: contentType.includes('image/webp') || objectKey.endsWith('.webp') ? 'webp' : 'png',
    };
}

async function putAvatarToS3(objectKey: string, buffer: Buffer, contentType: string): Promise<void> {
    const response = await s3Request('PUT', objectKey, buffer, contentType);
    if (!response.ok) {
        throw new Error(`S3 PUT ${objectKey} returned ${response.status}`);
    }
}

async function s3Request(method: 'GET' | 'PUT', objectKey: string, body?: Buffer, contentType?: string): Promise<Response> {
    if (!AVATAR_S3_ENDPOINT || !AVATAR_S3_BUCKET || !AVATAR_S3_ACCESS_KEY_ID || !AVATAR_S3_SECRET_ACCESS_KEY) {
        throw new Error('Avatar S3 config is missing');
    }

    const endpoint = new URL(AVATAR_S3_ENDPOINT);
    const encodedKey = objectKey.split('/').map(encodeURIComponent).join('/');
    const url = new URL(`${endpoint.pathname.replace(/\/$/, '')}/${AVATAR_S3_BUCKET}/${encodedKey}`, endpoint);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = crypto.createHash('sha256').update(body ?? '').digest('hex');
    const headers: Record<string, string> = {
        host: url.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
    };

    if (contentType) {
        headers['content-type'] = contentType;
    }

    headers.authorization = createS3AuthorizationHeader(method, url, headers, payloadHash, dateStamp, amzDate);
    return fetch(url, {
        method,
        headers,
        body,
    });
}

function createS3AuthorizationHeader(
    method: string,
    url: URL,
    headers: Record<string, string>,
    payloadHash: string,
    dateStamp: string,
    amzDate: string,
): string {
    const canonicalHeaders = Object.entries(headers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key.toLowerCase()}:${value.trim()}\n`)
        .join('');
    const signedHeaders = Object.keys(headers)
        .map(key => key.toLowerCase())
        .sort()
        .join(';');
    const canonicalRequest = [
        method,
        url.pathname,
        url.searchParams.toString(),
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${AVATAR_S3_REGION}/s3/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex'),
    ].join('\n');
    const signingKey = getS3SigningKey(dateStamp);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    return `AWS4-HMAC-SHA256 Credential=${AVATAR_S3_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function getS3SigningKey(dateStamp: string): Buffer {
    const dateKey = crypto.createHmac('sha256', `AWS4${AVATAR_S3_SECRET_ACCESS_KEY}`).update(dateStamp).digest();
    const regionKey = crypto.createHmac('sha256', dateKey).update(AVATAR_S3_REGION).digest();
    const serviceKey = crypto.createHmac('sha256', regionKey).update('s3').digest();
    return crypto.createHmac('sha256', serviceKey).update('aws4_request').digest();
}

function normaliseAvatarServerPath(avatarServerPath: string): string {
    return /^https?:\/\//i.test(avatarServerPath) ? avatarServerPath : `http://${avatarServerPath}`;
}

export async function generateAvatarFromSprite(avatar: CostumeData): Promise<AvatarImage> {
    // while (costumeData.length < 5) {
    //     costumeData.push(0);
    // }
    const kigurumiId = avatar.current_kigurumi;
    const headId = avatar.current_head;
    const bodyId = avatar.current_body;
    const faceId = avatar.current_face;
    const puchiId = avatar.current_puchi;
    let bodyMask, faceMask, headBodyMask, headFaceMask, body, face, head, kigurumi, puchi;
    if (kigurumiId === 0) {
        let bodyMaskPath = path.join(config.spritesPath, `masks/body-bodymask-${padToFourDigits(bodyId)}.png`);
        let faceMaskPath = path.join(config.spritesPath, `masks/body-facemask-${padToFourDigits(bodyId)}.png`);
        let bodyPath = path.join(config.spritesPath, `body/body-${padToFourDigits(bodyId)}.png`);
        let facePath = path.join(config.spritesPath, `face/face-${padToFourDigits(faceId)}.png`);
        let headBodyMaskPath = path.join(config.spritesPath, `masks/head-bodymask-${padToFourDigits(headId)}.png`);
        let headFaceMaskPath = path.join(config.spritesPath, `masks/head-facemask-${padToFourDigits(headId)}.png`);
        let headPath = path.join(config.spritesPath, `head/head-${padToFourDigits(headId)}.png`);

        if (fs.existsSync(bodyMaskPath)) {
            bodyMask = await loadImage(bodyMaskPath);
        } else {
            bodyMask = await loadImage(path.join(config.spritesPath, `masks/body-bodymask-0000.png`));
        }
        if (fs.existsSync(faceMaskPath)) {
            faceMask = await loadImage(faceMaskPath);
        } else {
            faceMask = await loadImage(path.join(config.spritesPath, `masks/body-facemask-0000.png`));
        }
        if (fs.existsSync(bodyPath)) {
            body = await loadImage(bodyPath);
        } else {
            body = await loadImage(path.join(config.spritesPath, `body/body-0000.png`));
        }
        if (fs.existsSync(facePath)) {
            face = await loadImage(facePath);
        } else {
            face = await loadImage(path.join(config.spritesPath, `face/face-0000.png`));
        }
        if (fs.existsSync(headBodyMaskPath)) {
            headBodyMask = await loadImage(headBodyMaskPath);
        } else {
            headBodyMask = await loadImage(path.join(config.spritesPath, `head/head-0000.png`));
        }
        if (fs.existsSync(headFaceMaskPath)) {
            headFaceMask = await loadImage(headFaceMaskPath);
        } else {
            headFaceMask = await loadImage(path.join(config.spritesPath, `head/head-0000.png`));
        }
        if (fs.existsSync(headPath)) {
            head = await loadImage(headPath);
        } else {
            head = await loadImage(path.join(config.spritesPath, `head/head-0000.png`));
        }
    } else {
        let kigurumiPath = path.join(config.spritesPath, `kigurumi/kigurumi-${padToFourDigits(kigurumiId)}.png`);
        let kigurumiBodyMaskPath = path.join(config.spritesPath, `masks/kigurumi-bodymask-${padToFourDigits(kigurumiId)}.png`);
        let kigurumiFaceMaskPath = path.join(config.spritesPath, `masks/kigurumi-facemask-${padToFourDigits(kigurumiId)}.png`);
        if (fs.existsSync(kigurumiPath)) {
            kigurumi = await loadImage(kigurumiPath);
        } else {
            kigurumi = await loadImage(path.join(config.spritesPath, `kigurumi/kigurumi-0000.png`));
        }
        if (fs.existsSync(kigurumiBodyMaskPath)) {
            bodyMask = await loadImage(kigurumiBodyMaskPath);
        } else {
            bodyMask = await loadImage(path.join(config.spritesPath, `masks/body-bodymask-0000.png`));
        }
        if (fs.existsSync(kigurumiFaceMaskPath)) {
            faceMask = await loadImage(kigurumiFaceMaskPath);
        } else {
            faceMask = await loadImage(path.join(config.spritesPath, `masks/body-facemask-0000.png`));
        }
    }
    let puchiPath = path.join(config.spritesPath, `puchi/puchi-${padToFourDigits(puchiId)}.png`);

    if (fs.existsSync(puchiPath)) {
        puchi = await loadImage(puchiPath);
    } else {
        puchi = await loadImage(path.join(config.spritesPath, `puchi/puchi-0000.png`));
    }

    // Create a canvas
    // Set the height of the final image
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');


    // Create colored masks
    const coloredBodyMask = await applyMaskAndColor(bodyMask, numberToColourMap[avatar.color_body] || numberToColourMap[0]);
    const coloredFaceMask = await applyMaskAndColor(faceMask, numberToColourMap[avatar.color_face] || numberToColourMap[0]);

    // Draw the colored masks onto the main canvas
    ctx.drawImage(coloredBodyMask, 0, 0);
    ctx.drawImage(coloredFaceMask, 0, 0);
    // Draw images on top
    ctx.globalCompositeOperation = 'source-over';
    if (kigurumiId === 0) {
        if (!body || !face || !head || !headFaceMask || !headBodyMask) {
            return {buffer: canvas.toBuffer('image/png'), filetype: 'png'};
        }
        ctx.drawImage(body, 0, 0);
        ctx.drawImage(face, 0, 0);
        const colouredHeadBodyMask = await applyMaskAndColor(headBodyMask, numberToColourMap[avatar.color_body] || numberToColourMap[0]);
        const colouredHeadFaceMask = await applyMaskAndColor(headFaceMask, numberToColourMap[avatar.color_face] || numberToColourMap[0]);
        ctx.drawImage(colouredHeadBodyMask, 0, 0);
        ctx.drawImage(colouredHeadFaceMask, 0, 0);
        ctx.drawImage(head, 0, 0);
    } else {
        if (!kigurumi) {
            return {buffer: canvas.toBuffer('image/png'), filetype: 'png'};
        }
        ctx.drawImage(kigurumi, 0, 0);
    }
    ctx.drawImage(puchi, 0, 0);

    // Save the final image
    return {buffer: canvas.toBuffer('image/png'), filetype: 'png'};
}
