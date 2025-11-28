import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/home';
import Dashboard from './pages/dashboard';
import Profile from './pages/profile';
import CreateShift from './pages/shifts/CreateShift';
import ShiftDetails from './pages/shifts/ShiftDetails';
import PostAvailability from './pages/workers/PostAvailability';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import RegisterComplete from './pages/auth/RegisterComplete';
import IdPortenCallback from './pages/auth/IdPortenCallback';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="shifts/create" element={<CreateShift />} />
        <Route path="shifts/:id" element={<ShiftDetails />} />
        <Route path="availability/post" element={<PostAvailability />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="register/complete" element={<RegisterComplete />} />
        <Route path="auth/callback" element={<IdPortenCallback />} />
        {/* Legg til flere ruter her etterhvert */}
      </Route>
    </Routes>
  );
}

export default App;