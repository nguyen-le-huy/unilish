import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { PATHS } from '@/config/paths';
import { Button } from '@/components/core/Button';

import styles from './Home.module.css';

const Home = () => {
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();        // Clear local app state
        navigate(PATHS.AUTH.LOGIN);
    };

    return (
        <div className={styles.container}>
            <h1>Home page</h1>
            <Button onClick={handleLogout} variant="outline">
                Logout
            </Button>
        </div>
    );
};

export default Home;