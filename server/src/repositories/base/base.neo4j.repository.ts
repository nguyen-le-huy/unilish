import { Driver, Session } from 'neo4j-driver';
import driver from '../../config/database.neo4j.js';

export abstract class BaseNeo4jRepository {
    protected driver: Driver;

    constructor() {
        this.driver = driver;
    }

    protected getSession(): Session {
        return this.driver.session();
    }

    async executeQuery(query: string, params: Record<string, any> = {}) {
        const session = this.getSession();
        try {
            const result = await session.run(query, params);
            return result.records;
        } finally {
            await session.close();
        }
    }
}
