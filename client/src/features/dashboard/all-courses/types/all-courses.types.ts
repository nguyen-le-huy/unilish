export interface CourseCatalogItem {
    _id: string;
    id?: string;
    name: string;
    slug: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    totalUnits: number;
}

export interface CourseCatalogFilters {
    search?: string;
    level?: CourseCatalogItem['level'];
}
