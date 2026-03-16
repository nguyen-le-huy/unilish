import React from 'react';
import styles from './SelectionCard.module.css';

interface SelectionCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	ariaLabel?: string;
	selected?: boolean;
	iconBackground?: boolean;
	descriptionClassName?: string;
	onClick?: () => void;
}

const SelectionCard = ({
	icon,
	title,
	description,
	ariaLabel,
	selected = false,
	iconBackground = true,
	descriptionClassName,
	onClick,
}: SelectionCardProps) => {
	const descriptionClassNames = descriptionClassName
		? `${styles.description} ${descriptionClassName}`
		: styles.description;

	return (
		<div
			className={`${styles.card} ${selected ? styles.selected : ''}`}
			onClick={onClick}
			role="button"
			aria-label={ariaLabel ?? title}
			aria-pressed={selected}
			tabIndex={0}
			onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
		>
			<div className={styles.topRow}>
				<div className={`${styles.iconBox} ${!iconBackground ? styles.iconBoxPlain : ''}`}>{icon}</div>
				<div className={`${styles.radio} ${selected ? styles.radioSelected : ''}`} aria-hidden="true" />
			</div>
			<h3 className={styles.title}>{title}</h3>
			<p className={descriptionClassNames}>{description}</p>
		</div>
	);
};

export default SelectionCard;
