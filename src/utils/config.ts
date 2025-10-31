import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'url';
import {Difficulty} from '@constants/datatable.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig: any = null;

export function validateConfig(): Record<string, any> {
    if (cachedConfig) return cachedConfig;

    const configPath = path.resolve(__dirname, '..', '..', 'config.json');

    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found at path: ${configPath}`);
    }

    let rawData: string;
    try {
        rawData = fs.readFileSync(configPath, 'utf-8');
    } catch (err) {
        throw new Error(`Error reading config file: ${err}`);
    }

    if (rawData.charCodeAt(0) === 0xFEFF) {
        rawData = rawData.slice(1);
    }

    let parsedConfig: any;
    try {
        parsedConfig = JSON.parse(rawData);
    } catch (err) {
        throw new Error(`Invalid JSON in config file: ${err}`);
    }

    if (typeof parsedConfig !== 'object' || parsedConfig === null) {
        throw new Error('Config file must contain a valid JSON object.');
    }

    const expectedSchema: Record<string, 'string' | 'object'> = {
        guildId: 'string',
        botChannelId: 'string',
        musicinfoPath: 'string',
        wordlistPath: 'string',
        internalDifficultyDataPath: 'string',
        spritesPath: 'string',
        serverBoostRoleId: 'string',
        adminRoleId: 'string',
        whitelistedAdmins: 'object',
        lockedSongs: 'object',
        deployment: 'string',
        // Emoji ID fields
        clearEmojiId: 'string',
        FCEmojiId: 'string',
        APEmojiId: 'string',
        failEmojiId: 'string',

        easyEmojiId: 'string',
        normalEmojiId: 'string',
        hardEmojiId: 'string',
        oniEmojiId: 'string',
        uraEmojiId: 'string',

        rank0EmojiId: 'string',
        rank1EmojiId: 'string',
        rank2EmojiId: 'string',
        rank3EmojiId: 'string',
        rank4EmojiId: 'string',
        rank5EmojiId: 'string',
        rank6EmojiId: 'string',

        dani1EmojiId: 'string',
        dani2EmojiId: 'string',
        dani3EmojiId: 'string',
        dani4EmojiId: 'string',
        dani5EmojiId: 'string',
        dani6EmojiId: 'string',

        goodEmojiId: 'string',
        okEmojiId: 'string',
        bad1EmojiId: 'string',
        bad2EmojiId: 'string'
    };

    const errors: string[] = [];

    for (const [key, expectedType] of Object.entries(expectedSchema)) {
        const value = parsedConfig[key];
        const actualType = typeof value;

        if (actualType !== expectedType) {
            errors.push(`Missing or invalid '${key}' (expected ${expectedType}, got ${actualType})`);
        }
    }

    if (errors.length > 0) {
        throw new Error('Config validation error(s):\n' + errors.join('\n'));
    }

    cachedConfig = parsedConfig;
    return parsedConfig;
}

const config = validateConfig();

export const crownIdToEmoji = (crownId: number): string => {
    switch (crownId) {
        case 1:
            return config.clearEmojiId;
        case 2:
            return config.FCEmojiId;
        case 3:
            return config.APEmojiId;
        default:
            return config.failEmojiId;
    }
};

export const difficultyToEmoji = (difficultyId: Difficulty): string => {
    switch (difficultyId) {
        case Difficulty.EASY:
            return config.easyEmojiId;
        case Difficulty.NORMAL:
            return config.normalEmojiId;
        case Difficulty.HARD:
            return config.hardEmojiId;
        case Difficulty.ONI:
            return config.oniEmojiId;
        case Difficulty.URA:
            return config.uraEmojiId;
        default:
            throw new Error('Unknown difficulty');
    }
};

export const rankIdToEmoji = (rankId: number): string => {
    return config[`rank${rankId}EmojiId`] ?? '';
};

export const daniClearStateToEmoji = (clearState: number): string => {
    return config[`dani${clearState}EmojiId`] ?? '';
};

export const judgeIdToEmoji = (judgeId: number): string => {
    switch (judgeId) {
        case 0:
            return config.goodEmojiId;
        case 1:
            return config.okEmojiId;
        case 2:
            return config.bad1EmojiId;
        case 3:
            return config.bad2EmojiId;
        default:
            return '';
    }
};
