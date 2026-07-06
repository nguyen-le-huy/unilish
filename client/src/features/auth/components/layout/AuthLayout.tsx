import type { ReactNode } from 'react';
import Right from '../right/Right';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
    children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => (
    <main className={styles.page} data-auth-page>
        <section className={styles.formPanel} aria-label="Xác thực tài khoản">
            {children}
        </section>
        <Right />
    </main>
);

export default AuthLayout;
