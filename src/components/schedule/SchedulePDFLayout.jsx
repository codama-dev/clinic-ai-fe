import React from 'react';
import { format } from 'date-fns';

const ROLES = [
    { key: 'receptionist', name: 'קבלה' },
    { key: 'assistant', name: 'אסיסטנטים' },
    { key: 'doctor', name: 'רופאים' },
];

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAYS_HE = {
    sunday: "יום ראשון",
    monday: "יום שני",
    tuesday: "יום שלישי",
    wednesday: "יום רביעי",
    thursday: "יום חמישי",
    friday: "יום שישי",
    saturday: "שבת"
};

const getShiftName = (shiftTemplate) => {
    const startHour = parseInt(shiftTemplate.start_time.split(':')[0]);
    if (startHour >= 5 && startHour < 14) return 'morning';
    return 'evening';
};

const SchedulePDFLayout = ({ schedule, shiftTemplates, weekStartDate, allEmployees }) => {
    if (!schedule) return null;

    const sortedTemplates = [...shiftTemplates].sort((a, b) => a.start_time.localeCompare(b.start_time));

    const getEmployeesForRole = (day, shiftName, roleKey) => {
        const employeeNames = schedule.schedule_data[day]?.[shiftName] || [];
        return allEmployees
            .filter(emp => employeeNames.includes(emp.name) && emp.role === roleKey)
            .map(emp => emp.name.split(' ')[0]); // Return first name
    };
    
    return (
        <div id="pdf-print-area">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;700&display=swap');
                
                #pdf-print-area {
                    display: none;
                    font-family: 'Assistant', sans-serif;
                }
                
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #pdf-print-area, #pdf-print-area * {
                        visibility: visible;
                    }
                    #pdf-print-area {
                        display: block;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        direction: rtl;
                        font-size: 10pt;
                    }
                    .print-table th, .print-table td {
                        border: 1px solid black;
                        padding: 4px;
                        text-align: center;
                        vertical-align: middle;
                    }
                    .print-table th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                    }
                    .role-cell {
                        font-weight: bold;
                    }
                    .header-container {
                        text-align: center;
                        margin-bottom: 16px;
                    }
                    .logo-img {
                        height: 50px;
                        object-fit: contain;
                    }
                }
            `}</style>

            <div className="header-container">
                <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d7b52d0d33b12757415b4f/7c4ff2a29_-.png"
                    alt="LoVeT לוגו"
                    className="logo-img"
                />
                <h2>לוח משמרות – לאב וט</h2>
                <p>שבוע {format(weekStartDate, 'dd.MM.yy')}</p>
            </div>

            <table className="print-table">
                <thead>
                    <tr>
                        <th>משמרת</th>
                        <th>יום</th>
                        {DAYS.map(day => <th key={day}>{DAYS_HE[day]}</th>)}
                        <th>כוננות שבת</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedTemplates.map(template => (
                        ROLES.map((role, roleIndex) => (
                            <tr key={`${template.id}-${role.key}`}>
                                {roleIndex === 0 && (
                                    <td rowSpan={ROLES.length}>
                                        <div className="font-bold">{template.name}</div>
                                        <div>({template.start_time} - {template.end_time})</div>
                                    </td>
                                )}
                                <td className="role-cell">{role.name}</td>
                                {DAYS.map(day => (
                                    <td key={day}>
                                        {getEmployeesForRole(day, getShiftName(template), role.key).join(', ')}
                                    </td>
                                ))}
                                {roleIndex === 0 && <td rowSpan={ROLES.length}></td>}
                            </tr>
                        ))
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SchedulePDFLayout;