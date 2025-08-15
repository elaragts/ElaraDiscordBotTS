import {RANK_THRESHOLDS} from '@constants/rating.js';

export function getRankFromAccuracy(accuracy: number): string {
    for (const [threshold, rank] of RANK_THRESHOLDS) {
        if (accuracy >= threshold) return rank;
    }
    return 'F';
}