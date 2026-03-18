import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/core/Button/Button';
import SelectionCard from '@/components/core/SelectionCard/SelectionCard';
import SelectionForm from '@/components/core/SelectionForm/SelectionForm';
import { Loading } from '@/components/common/Loading/Loading';
import { PATHS } from '@/config/paths';
import { useAuthStore } from '@/stores/auth.store';
import { useOnboardingDraftStore } from '@/stores/onboarding.store';
import { FALLBACK_GREETING } from '../../constants/language-selection.constants';
import { useAudioPlayer } from '../../hooks/use-audio-player';
import { useLanguagesQuery } from '../../hooks/use-languages-query';
import type { LanguageOption } from '../../types/language';
import styles from './language-selection-form.module.css';

const LanguageSelectionForm = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const setLanguageDraft = useOnboardingDraftStore((state) => state.setLanguage);
    const draftLanguageCode = useOnboardingDraftStore((state) => state.languageCode);
    const { playingCode, playGreeting } = useAudioPlayer();
    const { data: languages = [], isLoading, isError, refetch } = useLanguagesQuery();
    const [selectedCode, setSelectedCode] = useState<string | null>(draftLanguageCode ?? user?.nativeLanguage ?? null);
    const selectableLanguages = useMemo(() => {
        // Defensive guard in case backend contract is temporarily violated.
        return languages.filter((language) => language.isActive);
    }, [languages]);
    const handleSelectLanguage = useCallback((language: LanguageOption) => {
        setSelectedCode(language.code);
        playGreeting(language);
    }, [playGreeting]);
    const handleContinue = useCallback(() => {
        if (!selectedCode) {
            return;
        }
        const selectedLanguage = selectableLanguages.find((language) => language.code === selectedCode);
        if (!selectedLanguage) {
            toast.error('Không tìm thấy ngôn ngữ đã chọn. Vui lòng thử lại.');
            return;
        }

        setLanguageDraft(selectedLanguage.code, selectedLanguage._id);
        navigate(PATHS.DASHBOARD.GOAL_SELECTION);
    }, [navigate, selectableLanguages, selectedCode, setLanguageDraft]);

    return (
        <SelectionForm
            title="Chọn ngôn ngữ bạn muốn học"
            subtitle="Hãy chọn ngôn ngữ bạn muốn bắt đầu học. Bạn có thể thay đổi lựa chọn này sau."
            primaryAction={{
                label: 'Tiếp tục',
                disabled: !selectedCode || isLoading,
                onClick: handleContinue,
            }}
        >
            {isLoading && <Loading variant="inline" size="sm" className={styles.feedback} />}
            {isError && (
                <div className={styles.errorState}>
                    <p className={styles.feedback}>Không thể tải danh sách ngôn ngữ. Vui lòng thử lại.</p>
                    <Button type="button" variant="outline" padding="B" onClick={() => void refetch()}>
                        Thử lại
                    </Button>
                </div>
            )}
            {!isLoading && !isError && selectableLanguages.length === 0 && (
                <p className={styles.feedback}>Chưa có ngôn ngữ khả dụng. Vui lòng thử lại sau.</p>
            )}
            {!isLoading && !isError && selectableLanguages.length > 0 && (
                <div className={styles.cardGrid}>
                    {selectableLanguages.map((language) => (
                        <SelectionCard
                            key={language._id}
                            icon={(
                                language.flagIconUrl
                                    ? (
                                        <img src={language.flagIconUrl} alt={language.name} className={styles.flagIcon} />
                                    )
                                    : <span>{language.code.toUpperCase()}</span>
                            )}
                            title={language.name}
                            description={(language.greeting ?? FALLBACK_GREETING).trim() || FALLBACK_GREETING}
                            descriptionClassName={
                                playingCode === language.code
                                    ? `${styles.greetingText} ${styles.greetingPlaying}`
                                    : styles.greetingText
                            }
                            ariaLabel={`Chọn ngôn ngữ ${language.name}`}
                            selected={selectedCode === language.code}
                            iconBackground={false}
                            onClick={() => handleSelectLanguage(language)}
                        />
                    ))}
                </div>
            )}
        </SelectionForm>
    );
};

export default LanguageSelectionForm;
