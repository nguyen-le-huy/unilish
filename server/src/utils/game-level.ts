// GAME DESIGN DATA - LEVEL CURVE CONFIGURATION
// Logic: Linear Interpolation for XP requirements per level range.

interface LevelPhase {
    minLevel: number;
    maxLevel: number;
    startXpReq: number; // XP needed to pass the first level of this phase
    endXpReq: number;   // XP needed to pass the last level of this phase
}

const PHASES: LevelPhase[] = [
    { minLevel: 1, maxLevel: 20, startXpReq: 10, endXpReq: 40 },
    { minLevel: 21, maxLevel: 60, startXpReq: 60, endXpReq: 120 },
    { minLevel: 61, maxLevel: 90, startXpReq: 150, endXpReq: 250 },
    { minLevel: 91, maxLevel: 99, startXpReq: 300, endXpReq: 500 },
];

/**
 * Pre-calculate Cumulative XP Table for O(1) Lookup
 * Index = Level
 * Value = Total XP required to REACH that level
 * Example: LEVEL_TABLE[2] is Total XP needed to be Level 2 (which is XP to pass Level 1)
 */
const MAX_LEVEL = 99;
export const XP_TO_REACH_LEVEL: number[] = new Array(MAX_LEVEL + 2).fill(0);

// Helper to calc XP req for a specifc level based on phase
const getXpReqForLevel = (level: number): number => {
    const phase = PHASES.find(p => level >= p.minLevel && level <= p.maxLevel);
    if (!phase) return 500; // Fallback for > 99

    if (phase.minLevel === phase.maxLevel) return phase.startXpReq;

    // Linear interpolation
    const progress = (level - phase.minLevel) / (phase.maxLevel - phase.minLevel);
    return Math.round(phase.startXpReq + (phase.endXpReq - phase.startXpReq) * progress);
};

// Build the table
let cumulativeXp = 0;
for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    XP_TO_REACH_LEVEL[lvl] = cumulativeXp; // XP to reach Level 1 is 0. XP to reach Level 2 is XP_req(1).
    const xpNeededToPass = getXpReqForLevel(lvl);
    cumulativeXp += xpNeededToPass;
}
XP_TO_REACH_LEVEL[MAX_LEVEL + 1] = cumulativeXp; // Cap

export const GameLevelUtils = {
    /**
     * Calculate Level and Current Progress from Total XP
     */
    calculateLevelFromXp(totalXp: number) {
        if (totalXp < 0) totalXp = 0;

        // Find level where totalXp < XP_TO_REACH_LEVEL[level + 1]
        // Since array is sorted, we could use binary search, but loop is fine for 100 items.
        let level = 1;
        for (let i = 1; i <= MAX_LEVEL; i++) {
            if (totalXp >= (XP_TO_REACH_LEVEL[i] ?? 0)) {
                level = i;
            } else {
                break;
            }
        }

        if (level >= MAX_LEVEL) {
            return {
                level: MAX_LEVEL,
                currentLevelXp: totalXp - (XP_TO_REACH_LEVEL[MAX_LEVEL] ?? 0), // Surplus
                nextLevelThreshold: getXpReqForLevel(MAX_LEVEL),         // XP needed for 99->100 (virtual)
                progressPercent: 100,
                isMaxLevel: true
            };
        }

        const currentLevelStartTotalXp = XP_TO_REACH_LEVEL[level] ?? 0;
        const nextLevelStartTotalXp = XP_TO_REACH_LEVEL[level + 1] ?? (currentLevelStartTotalXp + 100);
        const xpRequiredForThisLevel = nextLevelStartTotalXp - currentLevelStartTotalXp;
        const xpGainedInThisLevel = totalXp - currentLevelStartTotalXp;

        return {
            level,
            currentLevelXp: xpGainedInThisLevel,
            nextLevelThreshold: xpRequiredForThisLevel,
            progressPercent: Math.min((xpGainedInThisLevel / xpRequiredForThisLevel) * 100, 100),
            isMaxLevel: false
        };
    },

    /**
     * Get Total XP required to reach a specific level
     */
    getTotalXpToReachLevel(level: number): number {
        if (level <= 1) return 0;
        if (level > MAX_LEVEL) return XP_TO_REACH_LEVEL[MAX_LEVEL] ?? 0;
        return XP_TO_REACH_LEVEL[level] ?? 0;
    }
};
