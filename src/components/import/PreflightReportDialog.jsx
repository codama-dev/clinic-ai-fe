import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { exportReportToCSV } from "./importHelpers";

const ITEMS_PER_PAGE = 50;

export default function PreflightReportDialog({ open, onClose, report, onConfirm, loading }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedOverrides, setSelectedOverrides] = useState({
    conflicts: new Set(),
    invalid: new Set(),
    to_skip: new Set()
  });
  const [currentPage, setCurrentPage] = useState({
    create: 1,
    update: 1,
    skip: 1,
    problems: 1
  });

  if (!report) return null;

  const handleToggleOverride = (category, rowIndex) => {
    setSelectedOverrides(prev => {
      const newSet = new Set(prev[category]);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return { ...prev, [category]: newSet };
    });
  };

  const handleSelectAllOverrides = (category) => {
    const items = report.details[category];
    setSelectedOverrides(prev => {
      const allSelected = items.every(item => prev[category].has(item.row_index));
      if (allSelected) {
        return { ...prev, [category]: new Set() };
      } else {
        return { ...prev, [category]: new Set(items.map(item => item.row_index)) };
      }
    });
  };

  const totalOverrides = selectedOverrides.conflicts.size + selectedOverrides.invalid.size + selectedOverrides.to_skip.size;

  const handleExportReport = () => {
    exportReportToCSV(report, `דוח_ייבוא_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            דוח ניתוח קובץ ייבוא - Preflight
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">ייווצרו</p>
                    <p className="text-3xl font-bold text-green-700">{report.summary.to_create}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">יעודכנו</p>
                    <p className="text-3xl font-bold text-blue-700">{report.summary.to_update}</p>
                  </div>
                  <AlertCircle className="w-10 h-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">יידלגו</p>
                    <p className="text-3xl font-bold text-gray-700">{report.summary.to_skip}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-gray-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 font-medium">לא תקינים</p>
                    <p className="text-3xl font-bold text-red-700">{report.summary.invalid}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">קונפליקטים</p>
                    <p className="text-3xl font-bold text-orange-700">{report.summary.conflicts}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">כפילויות בקובץ</p>
                    <p className="text-3xl font-bold text-yellow-700">{report.summary.duplicates_in_file}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tables */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="summary">סיכום</TabsTrigger>
              <TabsTrigger value="create">
                ייווצרו ({report.summary.to_create})
              </TabsTrigger>
              <TabsTrigger value="update">
                יעודכנו ({report.summary.to_update})
              </TabsTrigger>
              <TabsTrigger value="problems">
                בעיות ({report.summary.invalid + report.summary.conflicts})
              </TabsTrigger>
              <TabsTrigger value="skip">
                דילוגים ({report.summary.to_skip})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold mb-2">סיכום כולל</h3>
                <ul className="text-sm space-y-1">
                  <li>• סה"כ שורות בקובץ: <strong>{report.summary.total_rows}</strong></li>
                  <li>• לקוחות חדשים שייווצרו: <strong className="text-green-600">{report.summary.to_create}</strong></li>
                  <li>• לקוחות קיימים שיעודכנו: <strong className="text-blue-600">{report.summary.to_update}</strong></li>
                  <li>• שורות שיידלגו: <strong className="text-gray-600">{report.summary.to_skip}</strong></li>
                  <li>• שורות לא תקינות: <strong className="text-red-600">{report.summary.invalid}</strong></li>
                  <li>• קונפליקטים לפתרון: <strong className="text-orange-600">{report.summary.conflicts}</strong></li>
                </ul>
              </div>
              {report.summary.conflicts > 0 && (
                <div className="p-4 bg-orange-50 border border-orange-300 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <AlertTriangle className="inline w-4 h-4 ml-1" />
                    נמצאו {report.summary.conflicts} קונפליקטים שיש לפתור לפני המשך הייבוא. עבור לטאב "בעיות" לצפייה בפרטים.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="create">
              {report.details.to_create.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין לקוחות חדשים ליצירה</p>
              ) : (
                <>
                  <div className="overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>שורה</TableHead>
                          <TableHead>שם מלא</TableHead>
                          <TableHead>ת.ז</TableHead>
                          <TableHead>מס׳ לקוח שיוקצה</TableHead>
                          <TableHead>התאמה לפי</TableHead>
                          <TableHead>הערה</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.details.to_create
                          .slice((currentPage.create - 1) * ITEMS_PER_PAGE, currentPage.create * ITEMS_PER_PAGE)
                          .map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{row.row_index}</TableCell>
                              <TableCell className="font-medium">{row.full_name}</TableCell>
                              <TableCell className="font-mono text-sm">{row.id_number || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{row.assigned_client_number}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {row.match_by === 'ID_NUMBER' ? 'ת.ז' : row.match_by === 'CLIENT_NUMBER' ? 'מס׳ לקוח' : '-'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">{row.reason || '-'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                  {report.details.to_create.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        מציג {((currentPage.create - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage.create * ITEMS_PER_PAGE, report.details.to_create.length)} מתוך {report.details.to_create.length}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, create: Math.max(1, prev.create - 1) }))}
                          disabled={currentPage.create === 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm">{currentPage.create} / {Math.ceil(report.details.to_create.length / ITEMS_PER_PAGE)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, create: Math.min(Math.ceil(report.details.to_create.length / ITEMS_PER_PAGE), prev.create + 1) }))}
                          disabled={currentPage.create >= Math.ceil(report.details.to_create.length / ITEMS_PER_PAGE)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="update">
              {report.details.to_update.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין לקוחות קיימים לעדכון</p>
              ) : (
                <>
                  <div className="overflow-auto max-h-96 space-y-3">
                    {report.details.to_update
                      .slice((currentPage.update - 1) * ITEMS_PER_PAGE, currentPage.update * ITEMS_PER_PAGE)
                      .map((row, idx) => (
                        <Card key={idx} className="border-blue-200">
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold">{row.full_name}</p>
                                <p className="text-sm text-gray-600">שורה {row.row_index} | ת.ז: {row.id_number}</p>
                              </div>
                              <Badge>מס׳ לקוח: {row.client_number}</Badge>
                            </div>
                            <div className="space-y-1">
                              {row.changes && row.changes.length > 0 ? (
                                row.changes.map((change, cIdx) => (
                                  <div key={cIdx} className="text-sm flex items-center gap-2">
                                    <span className="font-medium text-gray-700 min-w-[80px]">{change.field}:</span>
                                    <span className="text-red-600 line-through">{change.old}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-600 font-semibold">{change.new}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-gray-500">אין שינויים</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                  {report.details.to_update.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        מציג {((currentPage.update - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage.update * ITEMS_PER_PAGE, report.details.to_update.length)} מתוך {report.details.to_update.length}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, update: Math.max(1, prev.update - 1) }))}
                          disabled={currentPage.update === 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm">{currentPage.update} / {Math.ceil(report.details.to_update.length / ITEMS_PER_PAGE)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => ({ ...prev, update: Math.min(Math.ceil(report.details.to_update.length / ITEMS_PER_PAGE), prev.update + 1) }))}
                          disabled={currentPage.update >= Math.ceil(report.details.to_update.length / ITEMS_PER_PAGE)}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="problems">
              <div className="space-y-4">
                {(() => {
                  // Combine all problems
                  const allProblems = [
                    ...report.details.invalid.map(r => ({ ...r, type: 'invalid' })),
                    ...report.details.conflicts.map(r => ({ ...r, type: 'conflict' }))
                  ];

                  if (allProblems.length === 0) {
                    return <p className="text-center text-gray-500 py-8">אין בעיות לדיווח! ✓</p>;
                  }

                  // Group by client name (for patients, use client field if available)
                  const groupedByClient = allProblems.reduce((acc, row) => {
                    const clientName = row.client?.full_name || row.full_name || 'ללא שם';
                    if (!acc[clientName]) {
                      acc[clientName] = [];
                    }
                    acc[clientName].push(row);
                    return acc;
                  }, {});

                  const clientNames = Object.keys(groupedByClient).sort((a, b) => a.localeCompare(b, 'he'));
                  const paginatedClientNames = clientNames.slice((currentPage.problems - 1) * 10, currentPage.problems * 10);

                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-800">כל הבעיות ({allProblems.length})</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            מקובץ לפי {clientNames.length} לקוחות
                          </p>
                          {(selectedOverrides.invalid.size + selectedOverrides.conflicts.size) > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              {selectedOverrides.invalid.size + selectedOverrides.conflicts.size} שורות נבחרו לעקיפה
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              handleSelectAllOverrides('invalid');
                              handleSelectAllOverrides('conflicts');
                            }}
                          >
                            {allProblems.every(item => {
                              if (item.type === 'invalid') return selectedOverrides.invalid.has(item.row_index);
                              if (item.type === 'conflict') return selectedOverrides.conflicts.has(item.row_index);
                              return false;
                            }) ? 'בטל הכל' : 'בחר הכל'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3 overflow-auto max-h-96">
                        {paginatedClientNames.map(clientName => {
                          const clientRows = groupedByClient[clientName];
                          const invalidRows = clientRows.filter(r => r.type === 'invalid');
                          const conflictRows = clientRows.filter(r => r.type === 'conflict');

                          return (
                            <Card key={clientName} className="border-gray-200">
                              <CardContent className="pt-4">
                                <div className="mb-3 pb-2 border-b">
                                  <h5 className="font-semibold text-lg">{clientName}</h5>
                                  <p className="text-xs text-gray-500">
                                    {clientRows.length} בעיות: {invalidRows.length} לא תקינות, {conflictRows.length} קונפליקטים
                                  </p>
                                </div>

                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-12">עקוף</TableHead>
                                      <TableHead>שורה</TableHead>
                                      <TableHead>שם לקוח</TableHead>
                                      <TableHead>שם מטופל</TableHead>
                                      <TableHead>מס׳ לקוח</TableHead>
                                      <TableHead>סוג</TableHead>
                                      <TableHead>סיבה</TableHead>
                                      <TableHead>פרטים</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {clientRows.map((row, idx) => {
                                      const category = row.type === 'invalid' ? 'invalid' : 'conflicts';
                                      const isSelected = selectedOverrides[category].has(row.row_index);
                                      const isPatient = row.normalized?.patient_name || row.client;

                                      return (
                                        <TableRow key={idx} className={isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}>
                                          <TableCell>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => handleToggleOverride(category, row.row_index)}
                                              className="w-4 h-4 cursor-pointer"
                                            />
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">{row.row_index}</TableCell>
                                          <TableCell className="font-medium">
                                            {isPatient ? (row.client?.full_name || '-') : (row.full_name || '-')}
                                          </TableCell>
                                          <TableCell className="font-medium">
                                            {isPatient ? (row.normalized?.patient_name || '-') : '-'}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm">
                                            {isPatient ? (row.normalized?.client_number || row.client?.client_number || '-') : (row.id_number || '-')}
                                          </TableCell>
                                          <TableCell>
                                            {row.type === 'invalid' ? (
                                              <Badge variant="destructive" className="text-xs">לא תקין</Badge>
                                            ) : (
                                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">קונפליקט</Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-sm">{row.reason}</TableCell>
                                          <TableCell className="text-sm text-gray-600">{row.reason_details}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      {clientNames.length > 10 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-500">
                            מציג {((currentPage.problems - 1) * 10) + 1}-{Math.min(currentPage.problems * 10, clientNames.length)} לקוחות מתוך {clientNames.length}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => ({ ...prev, problems: Math.max(1, prev.problems - 1) }))}
                              disabled={currentPage.problems === 1}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                            <span className="px-3 py-1 text-sm">{currentPage.problems} / {Math.ceil(clientNames.length / 10)}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => ({ ...prev, problems: Math.min(Math.ceil(clientNames.length / 10), prev.problems + 1) }))}
                              disabled={currentPage.problems >= Math.ceil(clientNames.length / 10)}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            <TabsContent value="skip">
              {(() => {
                const filteredSkipRows = report.details.to_skip.filter(row => row.reason !== 'לקוח קיים ללא שינויים');
                return filteredSkipRows.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">אין שורות שיידלגו</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-gray-600">ניתן לבחור רשומות לייבוא למרות שיידלגו</p>
                        {selectedOverrides.to_skip.size > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            {selectedOverrides.to_skip.size} שורות נבחרו לייבוא
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSelectAllOverrides('to_skip')}
                      >
                        {filteredSkipRows.every(item => selectedOverrides.to_skip.has(item.row_index)) ? 'בטל הכל' : 'בחר הכל'}
                      </Button>
                    </div>
                    <div className="overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">ייבא</TableHead>
                            <TableHead>שורה</TableHead>
                            <TableHead>שם מלא</TableHead>
                            <TableHead>ת.ז</TableHead>
                            <TableHead>התאמה לפי</TableHead>
                            <TableHead>סיבה</TableHead>
                            <TableHead>פרטים</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSkipRows.map((row, idx) => {
                          const isSelected = selectedOverrides.to_skip.has(row.row_index);
                          return (
                            <TableRow key={idx} className={isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleOverride('to_skip', row.row_index)}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </TableCell>
                              <TableCell>{row.row_index}</TableCell>
                              <TableCell className="font-medium">{row.full_name || '-'}</TableCell>
                              <TableCell className="font-mono text-sm">{row.id_number || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {row.match_by === 'ID_NUMBER' ? 'ת.ז' : row.match_by === 'CLIENT_NUMBER' ? 'מס׳ לקוח' : 'אין'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{row.reason}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">{row.reason_details || '-'}</TableCell>
                            </TableRow>
                            );
                            })}
                            </TableBody>
                            </Table>
                            </div>
                            </>
                            );
                            })()}
                            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-between items-center gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="w-4 h-4 ml-2" />
            ייצא דוח מפורט
          </Button>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ביטול
            </Button>
            <Button 
              onClick={() => onConfirm(selectedOverrides)} 
              disabled={loading}
            >
              {loading ? 'מייבא...' : `אשר ייבוא (${report.summary.to_create + report.summary.to_update + totalOverrides} פעולות)`}
            </Button>
          </div>
        </div>

        {totalOverrides > 0 && (
          <p className="text-sm text-blue-600 text-center">
            <AlertCircle className="inline w-4 h-4 ml-1" />
            נבחרו {totalOverrides} רשומות לעקיפה (ייובאו למרות בעיות)
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}