import React from 'react';
import { Navigate } from 'react-router-dom';

// Registration is handled entirely by Campus One SSO.
// All /register routes redirect to /login where users initiate the SSO flow.
const Register = () => <Navigate to="/login" replace />;

export default Register;
