import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Dog, Cat, PawPrint, Pill, AlertCircle, Trash2 } from 'lucide-react';

export default function HospitalizationCard({ animal, onEdit, onDelete }) {
    const isDischarged = animal.status === 'discharged';
    const isDeceased = animal.status === 'deceased';
    const hasTreatmentInstructions = animal.treatment_instructions && animal.treatment_instructions.length > 0;

    const AnimalIcon = () => {
        switch (animal.animal_type) {
            case 'כלב': return <Dog className="w-4 h-4 mr-1 text-gray-500"/>;
            case 'חתול': return <Cat className="w-4 h-4 mr-1 text-gray-500"/>;
            default: return null;
        }
    };
    
    const getStatusBadge = () => {
        if (isDeceased) {
            return <Badge variant="secondary" className="text-xs bg-gray-800 text-white">נפטר</Badge>;
        }
        if (isDischarged) {
            return <Badge variant="secondary" className="text-xs">שוחרר</Badge>;
        }
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">באשפוז</Badge>;
    };

    return (
        <Card className={`flex flex-col shadow-md rounded-xl overflow-hidden transition-all duration-300 ${isDeceased ? 'bg-gray-200 opacity-60' : isDischarged ? 'bg-gray-100 opacity-70' : 'bg-white hover:shadow-xl'}`}>
            <div className="h-48 w-full bg-gray-200">
                {animal.animal_image_url ? (
                    <img src={animal.animal_image_url} alt={animal.animal_name} className="h-full w-full object-cover" />
                ) : (
                    <div className="h-full w-full bg-purple-50 flex items-center justify-center">
                        <PawPrint className="w-16 h-16 text-purple-200" />
                    </div>
                )}
            </div>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <span className="font-bold text-xl">{animal.animal_name}</span>
                        </CardTitle>
                         <p className="text-sm text-gray-600">({animal.owner_name})</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                        {getStatusBadge()}
                        {hasTreatmentInstructions && (
                            <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-300">
                                <Pill className="w-3 h-3 ml-1" />
                                יש הנחיות טיפול
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2 pt-1">
                    <span>אשפוז מ: {new Date(animal.admission_date).toLocaleDateString('he-IL')}</span>
                     {animal.animal_type && <span className="flex items-center"><AnimalIcon/> {animal.animal_type}</span>}
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-gray-600 line-clamp-3">
                    <span className="font-semibold">אבחנה: </span> {animal.diagnoses || "לא צוין"}
                </p>
                
                {hasTreatmentInstructions && (
                    <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-900">הנחיות טיפול ({animal.treatment_instructions.length}):</span>
                        </div>
                        <ul className="text-xs text-purple-800 space-y-0.5">
                            {animal.treatment_instructions.slice(0, 2).map((instruction, index) => (
                                <li key={index} className="truncate">
                                    • {instruction.medication_name} - {instruction.dosage}
                                </li>
                            ))}
                            {animal.treatment_instructions.length > 2 && (
                                <li className="text-purple-600 font-medium">ועוד {animal.treatment_instructions.length - 2}...</li>
                            )}
                        </ul>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex gap-2">
                 <Button variant="outline" className="flex-1 bg-white hover:bg-gray-50" onClick={() => onEdit(animal)}>
                    <Edit className="w-4 h-4 ml-2" />
                    צפה / ערוך דוח
                </Button>
                {onDelete && (
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="bg-white hover:bg-red-50 text-red-600 border-red-200"
                      onClick={() => onDelete(animal.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}