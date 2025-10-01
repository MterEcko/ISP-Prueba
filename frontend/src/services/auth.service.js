// frontend/src/services/auth.service.js
import axios from 'axios';
import { API_URL } from './frontend_apiConfig'; 

class AuthService {
  login(username, password) {
    return axios
      .post(API_URL + 'auth/signin', {
        username,
        password
      })
      .then(response => {
        if (response.data.accessToken) {
          // ✅ CORREGIDO: Era 'auth/user', ahora es 'user'
          localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
      });
  }

  logout() {
    localStorage.removeItem('user');
  }

  register(username, email, password, fullName) {
    return axios.post(API_URL + 'auth/signup', {
      username,
      email,
      password,
      fullName
    });
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
  }
}

export default new AuthService();