import fs from "node:fs";
import {MusicinfoItem, SongInfo} from "../models/datatable";
import {Difficulty, Language, songResultSeparator} from "../constants/datatable";

import {musicinfoPath, wordlistPath} from "../../config.json";

const songTitles: Map<number, [string, string]> = new Map();
const musicinfo: Map<number, MusicinfoItem> = new Map();
const songIdMap: Map<string, number> = new Map();

export function initializeDatatable() {
    initializeMusicInfo();
    initializeWordlist();
}

function initializeMusicInfo() {
    let rawMusicinfoData;
    try {
        rawMusicinfoData = fs.readFileSync(musicinfoPath, "utf-8");
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
        musicinfo.set(item["uniqueId"], {
            id: item["id"],
            uniqueId: item["uniqueId"],
            stars: {
                [Difficulty.EASY]: item["starEasy"],
                [Difficulty.NORMAL]: item["starNormal"],
                [Difficulty.HARD]: item["starHard"],
                [Difficulty.ONI]: item["starMania"],
                [Difficulty.URA]: item["starUra"]
            },
            maxCombos: {
                [Difficulty.EASY]: item["easyOnpuNum"],
                [Difficulty.NORMAL]: item["normalOnpuNum"],
                [Difficulty.HARD]: item["hardOnpuNum"],
                [Difficulty.ONI]: item["maniaOnpuNum"],
                [Difficulty.URA]: item["uraOnpuNum"]
            },
            genreNo: item["genreNo"],
            papamama: item["papamama"]
        });
        songIdMap.set(item["id"], item["uniqueId"]);
    }
}

function initializeWordlist() {
    let wordlistData;
    try {
        wordlistData = fs.readFileSync(wordlistPath, "utf-8");
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
        if (key.startsWith("song") && !key.startsWith("song_sub") && !key.startsWith("song_detail")) {
            const id = key.slice(5); //remove song_ from id
            const uniqueId = songIdMap.get(id);
            if (uniqueId === undefined) {
                continue;
            }
            songTitles.set(uniqueId, [item.japaneseText, item.englishUsText]);
        }
    }
}


export function searchSong(query: string): Promise<Array<[string, string]>> {
    return Promise.resolve(searchSongSync(query));
}

export function searchSongSync(query: string): Array<[string, string]> {
    if (query === "") return [];
    query = query.toLowerCase();
    let results: Array<[string, string]> = []; // Return array
    for (const [uniqueId, titles] of songTitles.entries()) {
        for (const i in titles) {
            if (titles[i].toLowerCase() === query) {
                return [[titles[i], `${uniqueId}${songResultSeparator}${i}`]];
            }
            if (titles[i].toLowerCase().includes(query)) {
                // Append the song for a partial match
                if (results.length < 10) results.push([titles[i], `${uniqueId}${songResultSeparator}${i}`]); // Limit results to 10
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
    return titles !== undefined ? titles[lang] : "";
}

export function getSongStars(uniqueId: number, difficulty: Difficulty): number {
    const result = musicinfo.get(uniqueId);
    if (result === undefined) return 0;
    return result.stars[difficulty];
}

export function getNoteCountOfSong(uniqueId: number, difficulty: Difficulty): number {
    const result = musicinfo.get(uniqueId);
    if (result === undefined) return 0;
    return result.maxCombos[difficulty];
}

