import React from 'react';
import styles from './SelectionForm.module.css';
import { Button } from '@/components/core/Button/Button';

interface ActionConfig {
	label: string;
	onClick?: () => void;
	disabled?: boolean;
}

interface SelectionFormProps {
	title: string;
	subtitle: string;
	children: React.ReactNode;
	primaryAction: ActionConfig;
	secondaryAction?: ActionConfig;
}

const SelectionForm = ({ title, subtitle, children, primaryAction, secondaryAction }: SelectionFormProps) => {
	return (
		<div className={styles.container}>
			<div className={styles.heading}>
				<h3 className={styles.title}>{title}</h3>
				<p className={styles.subtitle}>{subtitle}</p>
			</div>

			<div className={styles.content}>{children}</div>

			<div className={styles.actions}>
				{secondaryAction && (
					<Button variant="outline" padding="B" onClick={secondaryAction.onClick}>
						{secondaryAction.label}
					</Button>
				)}
				<Button
					variant="primary"
					padding="B"
					onClick={primaryAction.onClick}
					disabled={primaryAction.disabled}
				>
					{primaryAction.label}
				</Button>
			</div>
		</div>
	);
};

export default SelectionForm;
