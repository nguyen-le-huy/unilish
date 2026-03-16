import styles from './language-selection-page.module.css';
import LanguageSelectionForm from '../components/language-selection-form/language-selection-form';

const LanguageSelectionPage = () => {
    return (
        <div className={styles.container}>
            <LanguageSelectionForm />
        </div>
    );
};

export default LanguageSelectionPage;
