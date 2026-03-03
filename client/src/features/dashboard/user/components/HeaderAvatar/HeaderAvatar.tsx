import { useEffect, useState } from 'react';
import useHeaderAvatarData from '../../hooks/use-header-avatar-data';
import styles from './HeaderAvatar.module.css';

const HeaderAvatar = () => {
	const { avatarUrl, displayName, initials } = useHeaderAvatarData();
	const [hasImageError, setHasImageError] = useState(false);

	useEffect(() => {
		setHasImageError(false);
	}, [avatarUrl]);

	const shouldShowImage = Boolean(avatarUrl) && !hasImageError;

	return (
		<div className={styles.container} aria-label={`${displayName} avatar`} title={displayName}>
			{shouldShowImage ? (
				<img
					src={avatarUrl ?? ''}
					alt={`${displayName} avatar`}
					className={styles.image}
					onError={() => setHasImageError(true)}
				/>
			) : (
				<div className={styles.fallback} aria-hidden="true">
					{initials}
				</div>
			)}
		</div>
	);
};

export default HeaderAvatar;
