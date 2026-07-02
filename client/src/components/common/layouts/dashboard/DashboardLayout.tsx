import type { ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import styles from './Dashboard-Layout.module.css';

interface Props {
	children?: ReactNode;
}

const DashboardLayout = ({ children }: Props) => {
	const { pathname } = useLocation();
	const isLessonPlayer = pathname.startsWith('/dashboard/learning/lessons/');

	return (
		<div className={`${styles.layout} ${isLessonPlayer ? styles.lessonLayout : ''}`}>
            <Header />
			<div className={styles.contentArea}>
				<main className={`${styles.main} ${isLessonPlayer ? styles.lessonMain : ''}`}>
					{children ?? <Outlet />}
				</main>
			</div>
		</div>
	);
};

export default DashboardLayout;
