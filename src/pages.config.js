import AdminDashboard from './pages/AdminDashboard';
import AppointmentTypesManager from './pages/AppointmentTypesManager';
import ApproveSchedules from './pages/ApproveSchedules';
import CalendarSettingsManager from './pages/CalendarSettingsManager';
import ClientFile from './pages/ClientFile';
import ClientManagementSettings from './pages/ClientManagementSettings';
import ClientPriceListPage from './pages/ClientPriceListPage';
import ClientsManagement from './pages/ClientsManagement';
import ClinicCalendar from './pages/ClinicCalendar';
import ConstraintSettingsManager from './pages/ConstraintSettingsManager';
import Constraints from './pages/Constraints';
import CustomPriceListPage from './pages/CustomPriceListPage';
import EmployeeManagement from './pages/EmployeeManagement';
import FormsManagement from './pages/FormsManagement';
import Home from './pages/Home';
import Hospitalization from './pages/Hospitalization';
import HospitalizationReport from './pages/HospitalizationReport';
import InventoryManagement from './pages/InventoryManagement';
import MarpetTracking from './pages/MarpetTracking';
import MedicalDashboard from './pages/MedicalDashboard';
import MedicalManagement from './pages/MedicalManagement';
import MessageTemplatesManager from './pages/MessageTemplatesManager';
import MyProfile from './pages/MyProfile';
import NotificationsManager from './pages/NotificationsManager';
import OrderDetails from './pages/OrderDetails';
import OrderManagement from './pages/OrderManagement';
import PriceListsPage from './pages/PriceListsPage';
import ProtocolTemplatesManager from './pages/ProtocolTemplatesManager';
import Protocols from './pages/Protocols';
import ReportsPage from './pages/ReportsPage';
import Schedule from './pages/Schedule';
import ShiftTemplatesManager from './pages/ShiftTemplatesManager';
import SupplierPriceListPage from './pages/SupplierPriceListPage';
import TimeClock from './pages/TimeClock';
import TimeClockManagement from './pages/TimeClockManagement';
import UsersPage from './pages/UsersPage';
import VacationRequests from './pages/VacationRequests';
import VetReferrals from './pages/VetReferrals';
import WeeklyScheduleManager from './pages/WeeklyScheduleManager';
import XMLDataImport from './pages/XMLDataImport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "AppointmentTypesManager": AppointmentTypesManager,
    "ApproveSchedules": ApproveSchedules,
    "CalendarSettingsManager": CalendarSettingsManager,
    "ClientFile": ClientFile,
    "ClientManagementSettings": ClientManagementSettings,
    "ClientPriceListPage": ClientPriceListPage,
    "ClientsManagement": ClientsManagement,
    "ClinicCalendar": ClinicCalendar,
    "ConstraintSettingsManager": ConstraintSettingsManager,
    "Constraints": Constraints,
    "CustomPriceListPage": CustomPriceListPage,
    "EmployeeManagement": EmployeeManagement,
    "FormsManagement": FormsManagement,
    "Home": Home,
    "Hospitalization": Hospitalization,
    "HospitalizationReport": HospitalizationReport,
    "InventoryManagement": InventoryManagement,
    "MarpetTracking": MarpetTracking,
    "MedicalDashboard": MedicalDashboard,
    "MedicalManagement": MedicalManagement,
    "MessageTemplatesManager": MessageTemplatesManager,
    "MyProfile": MyProfile,
    "NotificationsManager": NotificationsManager,
    "OrderDetails": OrderDetails,
    "OrderManagement": OrderManagement,
    "PriceListsPage": PriceListsPage,
    "ProtocolTemplatesManager": ProtocolTemplatesManager,
    "Protocols": Protocols,
    "ReportsPage": ReportsPage,
    "Schedule": Schedule,
    "ShiftTemplatesManager": ShiftTemplatesManager,
    "SupplierPriceListPage": SupplierPriceListPage,
    "TimeClock": TimeClock,
    "TimeClockManagement": TimeClockManagement,
    "UsersPage": UsersPage,
    "VacationRequests": VacationRequests,
    "VetReferrals": VetReferrals,
    "WeeklyScheduleManager": WeeklyScheduleManager,
    "XMLDataImport": XMLDataImport,
}

export const pagesConfig = {
    mainPage: "Schedule",
    Pages: PAGES,
    Layout: __Layout,
};