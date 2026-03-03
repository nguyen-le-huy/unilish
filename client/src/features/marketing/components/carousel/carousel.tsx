import type { CSSProperties } from 'react';
import styles from './carousel.module.css';

interface Props {
	items?: string[];
}

const defaultItems = ['English', 'Korean', 'Italian', 'Japanese', 'French', 'Spanish', 'German', 'Chinese', 'Portuguese', 'Russian'];

const Carousel = ({ items = defaultItems }: Props) => {
	const loopItems = [...items, ...items];
	const trackKey = items.join('-');
	const trackStyle: CSSProperties & Record<'--item-count' | '--duration', string | number> = {
		'--item-count': items.length,
		'--duration': `${Math.max(items.length * 4, 32)}s`,
	};

	return (
		<section className={styles.slider} aria-label="Supported languages carousel">
			<div key={trackKey} className={styles.track} style={trackStyle}>
				{loopItems.map((item, index) => (
					<div
						key={`${item}-${index}`}
						className={styles.slide}
						aria-hidden={index >= items.length}
					>
						{item}
					</div>
				))}
			</div>
		</section>
	);
};

export default Carousel;
