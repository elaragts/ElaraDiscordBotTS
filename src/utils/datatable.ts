import fs from 'node:fs';
import {InternalDifficultyItem, MusicinfoItem, SongInfo} from '@models/datatable.js';
import {Difficulty, Language, songResultSeparator} from '@constants/datatable.js';
import config from '#config' with {type: 'json'};
import {SearchSongResult} from '@models/discord.js';

const songTitles: Map<number, [string, string]> = new Map();
const musicinfo: Map<number, MusicinfoItem> = new Map();
const songIdMap: Map<string, number> = new Map();
const internalDifficulty: Map<number, Map<Difficulty, InternalDifficultyItem>> = new Map();


export function initializeDatatable() {
    initializeMusicInfo();
    initializeWordlist();
    initializeInternalDifficulties();
}

function initializeMusicInfo() {
    const lockedSongsSet = new Set(config.lockedSongs);
    let rawMusicinfoData;
    try {
        rawMusicinfoData = fs.readFileSync(config.musicinfoPath, 'utf-8');
    } catch (err) {
        throw new Error(`Error reading musicinfo file: ${err}`);
    }

    // Remove BOM if present
    if (rawMusicinfoData.charCodeAt(0) === 0xFEFF) {
        rawMusicinfoData = rawMusicinfoData.slice(1);
    }

    let parsedMusicinfo: { items: Array<any> };
    try {
        parsedMusicinfo = JSON.parse(rawMusicinfoData);
    } catch (err) {
        throw new Error(`Invalid JSON in musicinfo file: ${err}`);
    }

    for (const item of parsedMusicinfo.items) {
        if (lockedSongsSet.has(item['uniqueId'])) continue;
        musicinfo.set(item['uniqueId'], {
            id: item['id'],
            uniqueId: item['uniqueId'],
            stars: {
                [Difficulty.EASY]: item['starEasy'],
                [Difficulty.NORMAL]: item['starNormal'],
                [Difficulty.HARD]: item['starHard'],
                [Difficulty.ONI]: item['starMania'],
                [Difficulty.URA]: item['starUra']
            },
            maxCombos: {
                [Difficulty.EASY]: item['easyOnpuNum'],
                [Difficulty.NORMAL]: item['normalOnpuNum'],
                [Difficulty.HARD]: item['hardOnpuNum'],
                [Difficulty.ONI]: item['maniaOnpuNum'],
                [Difficulty.URA]: item['uraOnpuNum']
            },
            genreNo: item['genreNo'],
            papamama: item['papamama']
        });
        songIdMap.set(item['id'], item['uniqueId']);
    }
}

function initializeWordlist() {
    let wordlistData;
    try {
        wordlistData = fs.readFileSync(config.wordlistPath, 'utf-8');
    } catch (err) {
        throw new Error(`Error reading wordlist file: ${err}`);
    }

    // Remove BOM if present
    if (wordlistData.charCodeAt(0) === 0xFEFF) {
        wordlistData = wordlistData.slice(1);
    }

    let parsedWordlist: { items: Array<any> };
    try {
        parsedWordlist = JSON.parse(wordlistData);
    } catch (err) {
        throw new Error(`Invalid JSON in wordlist file: ${err}`);
    }
    for (const item of parsedWordlist.items) {
        const key = item.key;
        if (key.startsWith('song') && !key.startsWith('song_sub') && !key.startsWith('song_detail')) {
            const id = key.slice(5); //remove song_ from id
            const uniqueId = songIdMap.get(id);
            if (uniqueId === undefined || songTitles.has(uniqueId)) {
                continue;
            }
            songTitles.set(uniqueId, [item.japaneseText, item.englishUsText]);
        }
    }
}

export function initializeInternalDifficulties()  {
    let rawData: string;

    try {
        rawData = fs.readFileSync(config.internalDifficultyDataPath, "utf-8");
    } catch (err) {
        throw new Error(`Error reading internal difficulty file: ${err}`);
    }

    if (rawData.charCodeAt(0) === 0xFEFF) {
        rawData = rawData.slice(1);
    }

    let parsed: Record<string, Record<string, any>>;
    try {
        parsed = JSON.parse(rawData);
    } catch (err) {
        throw new Error(`Invalid JSON in internal difficulty file: ${err}`);
    }


    for (const [uniqueIdStr, difficulties] of Object.entries(parsed)) {
        const uniqueId = Number(uniqueIdStr);
        const diffMap = new Map<Difficulty, InternalDifficultyItem>();

        for (const [diffKey, data] of Object.entries(difficulties)) {
            const diff = Number(diffKey) as Difficulty;

            diffMap.set(diff, {
                bpm: Number(data.bpm),
                bpmChange: data.bpmChange,
                star: Number(data.star),
                difficulty: Number(data.difficulty),
            });
        }

        internalDifficulty.set(uniqueId, diffMap);
    }
}

export function searchSong(query: string): Promise<SearchSongResult[]> {
    return Promise.resolve(searchSongSync(query));
}

export function searchSongSync(query: string): SearchSongResult[] {
    if (query === '') return [];
    query = query.toLowerCase();
    let results: SearchSongResult[] = []; // Return array
    for (const [uniqueId, titles] of songTitles.entries()) {
        for (const i in titles) {
            if (titles[i].toLowerCase() === query) {
                return [{title: titles[i], songOutput: `${uniqueId}${songResultSeparator}${i}`}];
            }
            if (titles[i].toLowerCase().includes(query)) {
                // Append the song for a partial match
                if (results.length < 10) results.push({
                    title: titles[i],
                    songOutput: `${uniqueId}${songResultSeparator}${i}`
                }); // Limit results to 10
            }
        }
    }
    return results;
}

export function isValidLang(lang: number): boolean {
    return Object.values(Language).includes(lang);
}

export function doesUniqueIdExist(uniqueId: number): boolean {
    return musicinfo.has(uniqueId);
}

export function getSongInfo(uniqueId: number): SongInfo | undefined {
    if (!doesUniqueIdExist(uniqueId)) {
        return undefined;
    }
    const songTitleResult = songTitles.get(uniqueId);
    if (songTitleResult === undefined) {
        throw new Error(`Song title not found: uniqueId ${uniqueId}`);
    }
    return {
        songTitles: songTitleResult,
        musicinfo: musicinfo.get(uniqueId)!
    };
}

export function getSongTitle(uniqueId: number, lang: Language): string {
    const titles = songTitles.get(uniqueId);
    return titles !== undefined ? titles[lang] : '';
}

export function getSongStars(uniqueId: number, difficulty: Difficulty): number {
    const result = musicinfo.get(uniqueId);
    if (result === undefined) return 0;
    return result.stars[difficulty];
}

export function getSongNoteCount(uniqueId: number, difficulty: Difficulty): number {
    const result = musicinfo.get(uniqueId);
    if (result === undefined) return 0;
    return result.maxCombos[difficulty];
}

export function getSongInternalDifficulty(uniqueId: number, difficulty: Difficulty): number {
    return internalDifficulty.get(uniqueId)?.get(difficulty)?.difficulty ?? 0;
}
