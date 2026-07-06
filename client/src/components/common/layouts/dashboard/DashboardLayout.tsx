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
	const isIeltsTest = /^\/dashboard\/ielts-practice\/(listening|reading|writing)\/[^/]+$/.test(pathname);
	const isFocusedWorkspace = isLessonPlayer || isIeltsTest;

	return (
		<div className={`${styles.layout} ${isFocusedWorkspace ? styles.focusedLayout : ''}`}>
            <Header />
			<div className={styles.contentArea}>
				<main className={`${styles.main} ${isLessonPlayer ? styles.lessonMain : ''} ${isIeltsTest ? styles.examMain : ''}`}>
					{children ?? <Outlet />}
				</main>
			</div>
		</div>
	);
};

export default DashboardLayout;
