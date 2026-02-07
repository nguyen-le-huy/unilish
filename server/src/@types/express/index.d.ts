import { IUser } from '../../models/mongo/user.model.js';

declare global {
    namespace Express {
        interface User extends IUser { }
    }
}

import 'express-session';
declare module 'express-session' {
    interface SessionData {
        token: string;
    }
}
