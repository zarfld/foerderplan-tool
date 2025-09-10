import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		title: 'Förderplan Tool - Erweiterte Features Demo',
		description:
			'Demonstration der neuen Features: Schülerverwaltung, Assessment-Speicherung und Vergleichsanalyse'
	};
};
