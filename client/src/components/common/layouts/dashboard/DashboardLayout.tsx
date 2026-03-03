import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Dock from './Dock';
import styles from './Dashboard-Layout.module.css';

interface Props {
	children?: ReactNode;
}

const DashboardLayout = ({ children }: Props) => {
	return (
		<div className={styles.layout}>
            <Header />
			<div className={styles.contentArea}>
				<main className={styles.main}>{children ?? <Outlet />}</main>
			</div>
            <Dock />
		</div>
	);
};

export default DashboardLayout;
