import { defineStore } from 'pinia'
import { login, register, updatePoint, getUser } from '@/api/user'
import { useRecipeStore } from '@/stores/recipeStore'
import socket from '@/socket/socket'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userId: localStorage.getItem('userId') || null,
    points: null,
    nickname: null,
    email: null,
    error: null,
    isLoading: false
  }),

  actions: {
    async register(email, nickname, password, role) {
      this.isLoading = true
      this.error = null

      try {
        const response = await register(email, nickname, password, role)

        // Перевірка помилок  
        if (response.status === 400) {
          this.error = response.response?.data.errors.reduce((acc, item) => {
            acc[item.path] = item.msg;
            return acc;
          }, {});

          this.isLoading = false;
          return
        }

        this.isLoading = false

      } catch (error) {
        console.log('error', error);
        this.error = error || 'Не вдалося зареєструватися'
      }
    },

    async login(email, password) {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await login(email, password);

        // Перевірка помилок  
        if (response.status === 400) {
          this.error = response.response?.data.errors.reduce((acc, item) => {
            acc[item.path] = item.msg;
            return acc;
          }, {});

          this.isLoading = false;
          return
        }

        localStorage.setItem('token', response?.token);
        localStorage.setItem('userId', response?.userId);

        this.token = response?.token;
        this.userId = response?.userId;
        this.points = response?.point;
        this.email = response?.email
        this.nickname = response?.nickname

        this.isLoading = false;

        useRecipeStore().fetchAllRecipes()
      } catch (error) {
        console.error('Помилка:', error);
        this.error = 'Виникла помилка з’єднання. Спробуйте ще раз.';
        this.isLoading = false;
      }
    },

    async getUser() {
      try {
        const response = await getUser(this.userId)
        this.points = response?.point
        this.email = response?.email
        this.nickname = response?.nickname

        if (response.status === 401) {
          this.logout()
        }

      } catch (error) {
        console.log('error', error);
      }
    },

    async fetchUpdatedPoints(id, point, userId) {
      try {
        const response = await updatePoint(point, userId)

        useRecipeStore().toggleRecipeCheckStatus(id, false)

        localStorage.setItem('point', response?.user?.point);

      } catch (error) {
        console.log('error', error);
      }
    },

    initSocket() {
      socket.on('userUpdated', (updatedUser) => {
        console.log('User updated:', updatedUser);

        if (updatedUser._id === this.userId) {
          this.points = updatedUser.point;
        }
      });
    },

    // Функція для оновлення користувача через сокет
    updateUser(userId, point) {
      socket.emit('updateUser', { userId, point });
    },

    isLoggedIn() {
      return !!this.token
    },

    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('userId')
      localStorage.removeItem('point')
      this.token = null
      this.userId = null
      this.points = null
    }
  },
})
