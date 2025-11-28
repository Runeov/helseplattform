import { API_BASE_URL, ENDPOINTS } from './constants';

export async function loginUser(email, password) {
  // Mock login for now
  console.log("Simulating login for:", email);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ 
        success: true, 
        token: "fake-jwt-token", 
        user: { name: "Anne Avdelingsleder", role: "admin" } 
      });
    }, 1000);
  });
}