import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BedDouble, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import HospitalizationCard from "../components/hospitalization/HospitalizationCard";
import { createPageUrl } from "@/utils";

export default function HospitalizationPage() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dischargedPage, setDischargedPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setIsAuthenticated(true);

      const animalsData = await base44.entities.HospitalizedAnimal.list('-created_date');
      setAnimals(animalsData);
    } catch (authError) {
      console.error("Authentication error:", authError);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setAnimals([]);
    }
    setIsLoading(false);
  };

  const handleEdit = (animal) => {
    // Navigate to report page with animal ID
    navigate(createPageUrl('HospitalizationReport') + `?id=${animal.id}&mode=edit`);
  };

  const handleCreate = () => {
    // Navigate to report page in create mode
    navigate(createPageUrl('HospitalizationReport') + `?mode=create`);
  };

  const handleDelete = async (animalId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את רשומת האשפוז?')) {
      return;
    }
    try {
      await base44.entities.HospitalizedAnimal.delete(animalId);
      await loadData(); // Reload the list
    } catch (error) {
      console.error('Error deleting hospitalized animal:', error);
      alert('שגיאה במחיקת רשומת האשפוז');
    }
  };
  
  const activeAnimals = animals.filter(a => a.status === 'active');
  const nonActiveAnimals = animals.filter(a => a.status === 'discharged' || a.status === 'deceased');

  // Pagination for non-active animals (discharged + deceased)
  const totalNonActivePages = Math.ceil(nonActiveAnimals.length / itemsPerPage);
  const paginatedNonActiveAnimals = nonActiveAnimals.slice(
    (dischargedPage - 1) * itemsPerPage,
    dischargedPage * itemsPerPage
  );

  if (isLoading) {
      return <p className="text-center text-lg mt-10">טוען...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול אשפוז</h1>
          <p className="text-gray-500">מעקב אחר חיות מאושפזות.</p>
        </div>
        <Button onClick={handleCreate} disabled={!isAuthenticated}>
          <Plus className="w-4 h-4 ml-2" />
          אשפוז חדש
        </Button>
      </div>
      
      <div className="space-y-8">
        <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BedDouble className="text-purple-600"/>
              חיות באשפוז פעיל
            </h2>
            {activeAnimals.length === 0 && <p className="text-gray-500">אין חיות באשפוז כרגע.</p>}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAnimals.map(animal => (
                    <HospitalizationCard 
                      key={animal.id} 
                      animal={animal} 
                      onEdit={handleEdit}
                      onDelete={currentUser?.role === 'admin' ? handleDelete : undefined}
                    />
                ))}
            </div>
        </section>
        
        <section>
            <h2 className="text-xl font-semibold mb-4">היסטוריית אשפוז</h2>
            {nonActiveAnimals.length === 0 ? (
              <p className="text-gray-500">אין חיות בהיסטוריה.</p>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">שם החיה</TableHead>
                          <TableHead className="text-right">שם הבעלים</TableHead>
                          <TableHead className="text-right">סוג</TableHead>
                          <TableHead className="text-right">תאריך אשפוז</TableHead>
                          <TableHead className="text-right">משקל בהגעה</TableHead>
                          <TableHead className="text-right">אבחנות</TableHead>
                          <TableHead className="text-center">סטטוס</TableHead>
                          <TableHead className="text-center">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedNonActiveAnimals.map(animal => (
                          <TableRow key={animal.id}>
                            <TableCell className="font-medium text-right">{animal.animal_name}</TableCell>
                            <TableCell className="text-right">{animal.owner_name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{animal.animal_type}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {new Date(animal.admission_date).toLocaleDateString('he-IL')}
                            </TableCell>
                            <TableCell className="text-right">
                              {animal.admission_weight ? `${animal.admission_weight} ק"ג` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="max-w-xs truncate" title={animal.diagnoses}>
                                {animal.diagnoses || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {animal.status === 'discharged' ? (
                                <Badge className="bg-green-100 text-green-800">שוחרר</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800">נפטר</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEdit(animal)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {totalNonActivePages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <div className="text-sm text-gray-500">
                        מציג {((dischargedPage - 1) * itemsPerPage) + 1}-{Math.min(dischargedPage * itemsPerPage, nonActiveAnimals.length)} מתוך {nonActiveAnimals.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDischargedPage(prev => Math.max(1, prev - 1))}
                          disabled={dischargedPage === 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                          הקודם
                        </Button>
                        <span className="text-sm font-medium">
                          עמוד {dischargedPage} מתוך {totalNonActivePages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDischargedPage(prev => Math.min(totalNonActivePages, prev + 1))}
                          disabled={dischargedPage === totalNonActivePages}
                        >
                          הבא
                          <ChevronLeft className="h-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        </section>
      </div>
    </div>
  );
}