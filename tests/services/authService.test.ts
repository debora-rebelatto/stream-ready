import { authService } from '../../src/services/authService';
import { api } from '../../src/lib/api';

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('armazenamento local (getAuthKey, setAuthKey, clearAuth)', () => {
    test('deve retornar null quando authKey não estiver definido', () => {
      expect(authService.getAuthKey()).toBeNull();
    });

    test('deve salvar e recuperar authKey no localStorage', () => {
      authService.setAuthKey('minha_chave_123');
      expect(authService.getAuthKey()).toBe('minha_chave_123');
      expect(localStorage.getItem('stremioEmail')).toBeNull();
    });

    test('deve salvar também o e-mail quando fornecido em setAuthKey', () => {
      authService.setAuthKey('minha_chave_456', 'user@example.com');
      expect(authService.getAuthKey()).toBe('minha_chave_456');
      expect(localStorage.getItem('stremioEmail')).toBe('user@example.com');
    });

    test('deve limpar chaves e e-mail com clearAuth', () => {
      authService.setAuthKey('chave_a_remover', 'teste@teste.com');
      authService.clearAuth();
      expect(authService.getAuthKey()).toBeNull();
      expect(localStorage.getItem('stremioEmail')).toBeNull();
    });
  });

  describe('delegação para API', () => {
    test('getStatus deve chamar api.getAuthStatus', async () => {
      const mockStatus = { loggedIn: true, user: { id: 'u1', email: 'user@test.com' } };
      const spy = jest.spyOn(api, 'getAuthStatus').mockResolvedValue(mockStatus);

      const result = await authService.getStatus();
      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(mockStatus);
    });

    test('login deve delegar credenciais para api.login', async () => {
      const creds = { email: 'user@test.com', password: 'secretpassword' };
      const mockLoginResponse = {
        success: true,
        authKey: 'auth_abc_123',
        user: { id: 'u1', email: 'user@test.com' },
      };
      const spy = jest.spyOn(api, 'login').mockResolvedValue(mockLoginResponse);

      const result = await authService.login(creds);
      expect(spy).toHaveBeenCalledWith(creds);
      expect(result).toEqual(mockLoginResponse);
    });

    test('logout deve chamar api.logout', async () => {
      const spy = jest.spyOn(api, 'logout').mockResolvedValue();

      await authService.logout();
      expect(spy).toHaveBeenCalled();
    });

    test('installToAccount deve chamar api.installToAccount', async () => {
      const mockResponse = { success: true, message: 'Addon instalado com sucesso' };
      const spy = jest.spyOn(api, 'installToAccount').mockResolvedValue(mockResponse);

      const result = await authService.installToAccount();
      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    test('deleteAccount deve chamar api.deleteAccount', async () => {
      const mockResponse = { success: true, message: 'Account deleted' };
      const spy = jest.spyOn(api, 'deleteAccount').mockResolvedValue(mockResponse);

      const result = await authService.deleteAccount();
      expect(spy).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });
});
