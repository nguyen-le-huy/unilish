import BuildingAlert from '../../components/BuildingAlert/BuildingAlert';

import styles from './home-page.module.css';

const DashboardHomePage = () => {
    return (
        <div className={styles.content}>
            <BuildingAlert />
        </div>
    );
};

export default DashboardHomePage;