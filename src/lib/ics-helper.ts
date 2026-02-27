export function generateICS(meeting: {
    title: string;
    description: string;
    date: string;
    time: string;
}) {
    const startDateTime = new Date(`${meeting.date}T${meeting.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000);

    const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//AgendaLink//FR',
        'BEGIN:VEVENT',
        `DTSTART:${formatDate(startDateTime)}`,
        `DTEND:${formatDate(endDateTime)}`,
        `SUMMARY:${meeting.title}`,
        `DESCRIPTION:${meeting.description || ''}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${meeting.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
