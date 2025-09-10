import jsPDF from 'jspdf';

export async function saveDocument(data: any, filename: string): Promise<void> {
	try {
		const dataStr = JSON.stringify(data, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });

		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
		console.log('Document saved successfully:', filename);
	} catch (error) {
		console.error('Error saving document:', error);
		throw error;
	}
}

export async function exportToPDF(data: any, filename: string): Promise<void> {
	try {
		const pdf = new jsPDF('p', 'mm', 'a4');
		let yPosition = 20;
		const lineHeight = 6;
		const pageHeight = 280;
		const pageWidth = 200;

		// Helper function to check if we need a new page
		const checkNewPage = (requiredSpace: number = 30) => {
			if (yPosition + requiredSpace > pageHeight) {
				pdf.addPage();
				yPosition = 20;
			}
		};

		// Helper function to draw a simple table row
		const drawTableRow = (cols: string[], colWidths: number[], y: number, isHeader = false) => {
			let x = 20;
			pdf.setDrawColor(0);
			pdf.setLineWidth(0.1);

			cols.forEach((col, i) => {
				if (isHeader) {
					pdf.setFillColor(240, 240, 240);
					pdf.rect(x, y, colWidths[i], 8, 'FD');
					pdf.setFont('helvetica', 'bold');
					pdf.setFontSize(8);
				} else {
					pdf.rect(x, y, colWidths[i], 8, 'D');
					pdf.setFont('helvetica', 'normal');
					pdf.setFontSize(7);
				}

				const text = col.length > 30 ? col.substring(0, 27) + '...' : col;
				pdf.text(text, x + 1, y + 5);
				x += colWidths[i];
			});
		};

		// Title
		pdf.setFontSize(18);
		pdf.setFont('helvetica', 'bold');
		pdf.text('Förderplan für den Förderunterricht', 20, yPosition);
		yPosition += 15;

		// Header Information
		if (data.student || data.assessmentPeriod) {
			pdf.setFontSize(10);
			pdf.setFont('helvetica', 'normal');

			const info = [
				data.assessmentPeriod?.timeframe ? `Zeitraum: ${data.assessmentPeriod.timeframe}` : '',
				data.student?.class ? `Klasse: ${data.student.class}` : '',
				data.student?.teacher ? `Klassenlehrerin: ${data.student.teacher}` : '',
				data.student?.name ? `SchülerIn: ${data.student.name}` : ''
			].filter(Boolean);

			info.forEach((line) => {
				pdf.text(line, 20, yPosition);
				yPosition += 6;
			});
			yPosition += 10;
		}

		// Subject Assessment Tables
		const subjects = [
			{ key: 'spracheSprechen', title: 'Sprache und Sprechen' },
			{ key: 'lesen', title: 'Lesen' },
			{ key: 'schreiben', title: 'Schreiben' },
			{ key: 'mathematik', title: 'Mathematik' }
		];

		subjects.forEach((subject) => {
			if (data[subject.key]?.assessments) {
				checkNewPage(50);

				// Section title
				pdf.setFontSize(12);
				pdf.setFont('helvetica', 'bold');
				pdf.text(subject.title, 20, yPosition);
				yPosition += 8;

				// Table header
				const colWidths = [90, 15, 20, 15, 40]; // Task, ja, teilw, nein, Anmerkung
				drawTableRow(
					['Beobachtungsaufgabe/Förderansatz', 'ja', 'teilw', 'nein', 'Anmerkung'],
					colWidths,
					yPosition,
					true
				);
				yPosition += 8;

				// Table rows
				data[subject.key].assessments.forEach((assessment: any) => {
					checkNewPage(10);
					const status = assessment.status || '';
					const ja = status === 'ja' ? 'X' : '';
					const teilweise = status === 'teilweise' ? 'X' : '';
					const nein = status === 'nein' ? 'X' : '';
					const notes = assessment.notes || '';

					drawTableRow([assessment.task, ja, teilweise, nein, notes], colWidths, yPosition);
					yPosition += 8;
				});

				yPosition += 10;
			}
		});

		// Fördermaßnahmen
		if (data.foerdermassnahmen) {
			checkNewPage(60);

			pdf.setFontSize(12);
			pdf.setFont('helvetica', 'bold');
			pdf.text('Fördermaßnahmen', 20, yPosition);
			yPosition += 10;

			const measures = [
				{ key: 'horenUnterscheiden', title: 'Bereich: Hören und Unterscheiden' },
				{ key: 'sprechenVerstehen', title: 'Bereich: Sprechen und Verstehen' },
				{ key: 'optischeWahrnehmung', title: 'Bereich: Optische Wahrnehmung' },
				{ key: 'mathematikFoerderung', title: 'Fördermaßnahmen Mathematik' }
			];

			measures.forEach((measure) => {
				if (data.foerdermassnahmen[measure.key]) {
					checkNewPage(30);

					pdf.setFontSize(10);
					pdf.setFont('helvetica', 'bold');
					pdf.text(measure.title, 20, yPosition);
					yPosition += 6;

					pdf.setFont('helvetica', 'normal');
					pdf.setFontSize(8);

					data.foerdermassnahmen[measure.key].forEach((item: any) => {
						checkNewPage(8);
						const applied = item.applied ? '[X]' : '[ ]';
						const text = `${applied} ${item.measure}`;
						pdf.text(text, 25, yPosition);

						if (item.notes) {
							pdf.text(`Bemerkung: ${item.notes}`, 30, yPosition + 3);
							yPosition += 3;
						}
						yPosition += 5;
					});

					yPosition += 5;
				}
			});
		}

		// Footer with metadata
		const finalY = 270;
		pdf.setFontSize(8);
		pdf.setFont('helvetica', 'normal');
		pdf.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 20, finalY);
		if (data.student?.teacher) {
			pdf.text(`Lehrkraft: ${data.student.teacher}`, 120, finalY);
		}

		pdf.save(filename);
		console.log('PDF exported successfully:', filename);
	} catch (error) {
		console.error('Error exporting PDF:', error);
		throw error;
	}
}
