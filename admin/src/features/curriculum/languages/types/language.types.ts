export interface Language {
    _id: string;
    code: string;
    name: string;
    nativeName: string;
    greeting?: string | null;
    greetingSound?: string | null;
    flagIconUrl?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface LanguageListQuery {
    isActive?: boolean;
    search?: string;
}

export interface CreateLanguagePayload {
    code: string;
    name: string;
    nativeName: string;
    greeting?: string;
    greetingSound?: string;
    flagIconUrl?: string;
    isActive: boolean;
}

export interface UpdateLanguagePayload {
    name?: string;
    nativeName?: string;
    greeting?: string | null;
    greetingSound?: string | null;
    flagIconUrl?: string | null;
    isActive?: boolean;
}
