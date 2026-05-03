import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PageTransition from './components/PageTransition';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { getSubdomain, getPortalUrl, SUBDOMAINS } from './utils/subdomain';
import ProtectedRoute from './components/ProtectedRoute';

// ── Entry & Auth Pages ────────────────────────────────────────────────────
import Onboarding         from './pages/auth/Onboarding';
import Login              from './pages/auth/Login';
import Register           from './pages/auth/Register';
import JoinAs             from './pages/auth/JoinAs';
import ForgotPassword     from './pages/auth/ForgotPassword';

// ── Onboarding Flow ───────────────────────────────────────────────────────
import StudentStatus       from './pages/onboarding/StudentStatus';
import AlumniLogin         from './pages/onboarding/AlumniLogin';
import StudentPortal       from './pages/onboarding/StudentPortal';
import ProfileCompletion   from './pages/onboarding/ProfileCompletion';
import EmployerRegistration from './pages/onboarding/EmployerRegistration';
import AwaitingVerification from './pages/onboarding/AwaitingVerification';

// ── Layouts ───────────────────────────────────────────────────────────────
import StaffLayout    from './layouts/StaffLayout';
import EmployerLayout from './layouts/EmployerLayout';

// ── Student Section ───────────────────────────────────────────────────────
import StudentDashboard   from './pages/student/Dashboard';
import StudentFeed        from './pages/student/Feed';
import JobBoard           from './pages/student/JobBoard';
import JobDetail          from './pages/student/JobDetail';
import CareerCenter       from './pages/student/CareerCenter';
import AICounselor        from './pages/student/AICounselor';
import MockInterview      from './pages/student/MockInterview';
import ApplicationTracker from './pages/student/ApplicationTracker';
import EventsCalendar     from './pages/student/EventsCalendar';
import StudentProfile     from './pages/student/Profile';
import EditProfile        from './pages/student/EditProfile';
import LearningPath      from './pages/student/LearningPath';
import Network            from './pages/student/Network';
import StudentMessages    from './pages/student/Messages';

// ── Staff Section ─────────────────────────────────────────────────────────
import StaffDashboard     from './pages/staff/Dashboard';
import StaffApplications  from './pages/staff/Applications';
import StaffCRMManager    from './pages/staff/CRMManager';
import StaffEvents        from './pages/staff/Events';
import StaffJobs          from './pages/staff/Jobs';
import StaffServices      from './pages/staff/Services';
import StaffReports       from './pages/staff/Reports';
import StaffProfile       from './pages/staff/Profile';
import StaffMessages      from './pages/staff/Messages';
import StaffSettings      from './pages/staff/Settings';
import StudentActivity   from './pages/staff/StudentActivity';

// ── Employer Section ──────────────────────────────────────────────────────
import EmployerDashboard      from './pages/employer/Dashboard';
import EmployerCandidates     from './pages/employer/Candidates';
import EmployerCandidateDetail from './pages/employer/CandidateDetail';
import EmployerJobs           from './pages/employer/Jobs';
import EmployerApplications   from './pages/employer/Applications';
import EmployerFeed           from './pages/employer/Feed';
import EmployerEvents         from './pages/employer/Events';
import EmployerProfile        from './pages/employer/Profile';
import EmployerMessages       from './pages/employer/Messages';
import EmployerSettings       from './pages/employer/Settings';

// ── Fallback ──────────────────────────────────────────────────────────────
import NotFound from './pages/NotFound';

// Wraps any element with a page-transition animation
const T = ({ children }: { children: React.ReactNode }) => (
    <PageTransition>{children}</PageTransition>
);

const App = () => {
    const subdomain = getSubdomain();

    return (
        <ToastProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        {/* --- Subdomain-specific Dashboard Routes --- */}
                        {subdomain === SUBDOMAINS.STUDENT && (
                            <Route path="/" element={<ProtectedRoute allowedRoles={['student']}><T><StudentDashboard /></T></ProtectedRoute>}>
                                <Route path="feed"             element={<StudentFeed />} />
                                <Route path="jobs"             element={<JobBoard />} />
                                <Route path="jobs/:id"         element={<JobDetail />} />
                                <Route path="career"           element={<CareerCenter />} />
                                <Route path="career/ai"        element={<AICounselor />} />
                                <Route path="career/learning"  element={<LearningPath />} />
                                <Route path="career/mock-interview" element={<MockInterview />} />
                                <Route path="applications"     element={<ApplicationTracker />} />
                                <Route path="events"           element={<EventsCalendar />} />
                                <Route path="profile"          element={<StudentProfile />} />
                                <Route path="profile/edit"     element={<EditProfile />} />
                                <Route path="network"          element={<Network />} />
                                <Route path="messages"         element={<StudentMessages />} />
                            </Route>
                        )}

                        {subdomain === SUBDOMAINS.STAFF && (
                            <Route path="/" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout /></ProtectedRoute>}>
                                <Route index               element={<StaffDashboard />} />
                                <Route path="activity"     element={<StudentActivity />} />
                                <Route path="applications" element={<StaffApplications />} />
                                <Route path="events"       element={<StaffEvents />} />
                                <Route path="crm"          element={<StaffCRMManager />} />
                                <Route path="jobs"         element={<StaffJobs />} />
                                <Route path="services"     element={<StaffServices />} />
                                <Route path="reports"      element={<StaffReports />} />
                                <Route path="profile"      element={<StaffProfile />} />
                                <Route path="messages"     element={<StaffMessages />} />
                                <Route path="settings"     element={<StaffSettings />} />
                            </Route>
                        )}

                        {subdomain === SUBDOMAINS.EMPLOYER && (
                            <Route path="/" element={<ProtectedRoute allowedRoles={['employer']}><EmployerLayout /></ProtectedRoute>}>
                                <Route index                      element={<EmployerDashboard />} />
                                <Route path="candidates"          element={<EmployerCandidates />} />
                                <Route path="candidates/:id"      element={<EmployerCandidateDetail />} />
                                <Route path="jobs"                element={<EmployerJobs />} />
                                <Route path="applications"        element={<EmployerApplications />} />
                                <Route path="feed"                element={<EmployerFeed />} />
                                <Route path="events"              element={<EmployerEvents />} />
                                <Route path="profile"             element={<EmployerProfile />} />
                                <Route path="messages"            element={<EmployerMessages />} />
                                <Route path="settings"            element={<EmployerSettings />} />
                            </Route>
                        )}

                        {/* --- Shared Public & Onboarding Routes --- */}
                        <Route path="/"           element={<Navigate to="/onboarding" replace />} />
                        <Route path="/onboarding" element={<T><Onboarding /></T>} />
                        <Route path="/login"            element={<T><Login /></T>} />
                        <Route path="/register"         element={<T><Register /></T>} />
                        <Route path="/join-as"          element={<T><JoinAs /></T>} />
                        <Route path="/forgot-password"  element={<T><ForgotPassword /></T>} />

                        {/* Onboarding / setup flow */}
                        <Route path="/student-status"        element={<T><StudentStatus /></T>} />
                        <Route path="/alumni-login"          element={<T><AlumniLogin /></T>} />
                        <Route path="/student-portal"        element={<T><StudentPortal /></T>} />
                        <Route path="/profile-completion"    element={<T><ProfileCompletion /></T>} />
                        <Route path="/employer-registration" element={<EmployerRegistration />} />
                        <Route path="/awaiting-verification" element={<AwaitingVerification />} />

                        {/* Legacy path support (optional, redirects to subdomain if needed or keeps working) */}
                        <Route path="/student/*" element={<Navigate to={getPortalUrl(SUBDOMAINS.STUDENT)} replace />} />
                        <Route path="/staff/*" element={<Navigate to={getPortalUrl(SUBDOMAINS.STAFF)} replace />} />
                        <Route path="/employer/*" element={<Navigate to={getPortalUrl(SUBDOMAINS.EMPLOYER)} replace />} />
                        
                        {/* Catch-all */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ToastProvider>
    );
};

export default App;

