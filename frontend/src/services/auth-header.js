// frontend/src/services/auth-header.js
export default function authHeader() {
  // Obtener el usuario del localStorage
  const user = JSON.parse(localStorage.getItem('user'));

  // Verificar si el usuario tiene token
  if (user && user.accessToken) {
    console.log('Token de autenticación encontrado');
    return { 'x-access-token': user.accessToken };
  } else {
    console.warn('No se encontró token de autenticación');
    return {};
  }
}