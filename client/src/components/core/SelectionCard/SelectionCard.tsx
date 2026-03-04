import React from 'react';
import styles from './SelectionCard.module.css';

interface SelectionCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	selected?: boolean;
	iconBackground?: boolean;
	onClick?: () => void;
}

const SelectionCard = ({ icon, title, description, selected = false, iconBackground = true, onClick }: SelectionCardProps) => {
	return (
		<div
			className={`${styles.card} ${selected ? styles.selected : ''}`}
			onClick={onClick}
			role="button"
			aria-pressed={selected}
			tabIndex={0}
			onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
		>
			<div className={styles.topRow}>
				<div className={`${styles.iconBox} ${!iconBackground ? styles.iconBoxPlain : ''}`}>{icon}</div>
				<div className={`${styles.radio} ${selected ? styles.radioSelected : ''}`} aria-hidden="true" />
			</div>
			<h3 className={styles.title}>{title}</h3>
			<p className={styles.description}>{description}</p>
		</div>
	);
};

export default SelectionCard;
