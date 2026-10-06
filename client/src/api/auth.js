import { get, post, put } from './client.js';

export const requestSignupOtp = (body) => post('/auth/signup/request-otp', body);
export const verifySignup = (body) => post('/auth/signup/verify', body);
export const requestLoginOtp = (body) => post('/auth/login/request-otp', body);
export const verifyLogin = (body) => post('/auth/login/verify', body);
export const staffLogin = (body) => post('/auth/staff/login', body);
export const fetchMe = () => get('/auth/me');
export const logout = () => post('/auth/logout');
export const saveProfile = (body) => put('/citizen/profile', body);
export const fetchPublicConfig = () => get('/public/config');
