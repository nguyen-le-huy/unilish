export interface LanguageOption {
    _id: string;
    code: string;
    name: string;
    nativeName: string;
    greeting?: string | null;
    greetingSound?: string | null;
    flagIconUrl?: string | null;
    isActive: boolean;
}
