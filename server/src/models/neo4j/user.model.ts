import { ELevel, EUserRole, EGender } from '../mongo/user.model.js';

/**
 * Neo4j Node Definition for User.
 * 
 * Strategy: Polyglot Persistence
 * - We only replicate fields necessary for Graph Traversal (filtering/recommendations).
 * - Master data remains in MongoDB (user.model.ts).
 */

export const UserLabel = 'User';

export interface IUserNode {
    // Identity (Immutable Link to MongoDB)
    userId: string;

    // Searchable Properties (for Graph Lookups/Filtering)
    email: string;
    fullName: string;

    // Contextual Data (for Recommendations)
    role: typeof EUserRole[keyof typeof EUserRole];
    currentLevel: typeof ELevel[keyof typeof ELevel];
    gender?: typeof EGender[keyof typeof EGender];

    // Metadata
    createdAt: string; // ISO 8601 String
    lastActiveAt?: string;
}

// Edge Definitions
export const EUserRel = {
    // Knowledge Graph
    MASTERED: 'MASTERED',               // (:User)-[:MASTERED {confidence: 0.9}]->(:Concept)
    STRUGGLING_WITH: 'STRUGGLING_WITH', // (:User)-[:STRUGGLING_WITH]->(:GrammarRule)

    // Learning Path
    ENROLLED_IN: 'ENROLLED_IN',         // (:User)-[:ENROLLED_IN {startedAt: '...'}]->(:Course)
    COMPLETED: 'COMPLETED',             // (:User)-[:COMPLETED {score: 10}]->(:Lesson)

    // Social
    FOLLOWS: 'FOLLOWS',                 // (:User)-[:FOLLOWS]->(:User)
} as const;
