import bcrypt from 'bcryptjs'
import { DatabaseWrapper, getCurrentTimestamp } from '../database/connection'

interface User {
  id: number
  name: string
  email: string
  password: string
  role: 'admin' | 'staff'
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export class AuthService {
  private db: DatabaseWrapper
  private currentUser: User | null = null

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  login(email: string, password: string): { success: boolean; message: string; user?: Omit<User, 'password'> } {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined

    if (!user) {
      return { success: false, message: 'E-posta adresi veya şifre hatalı.' }
    }

    if (user.status !== 'active') {
      return { success: false, message: 'Hesabınız aktif değil. Lütfen yönetici ile iletişime geçin.' }
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return { success: false, message: 'E-posta adresi veya şifre hatalı.' }
    }

    this.currentUser = user

    // Log the login
    this.logAction('login', 'user', user.id)

    const { password: _, ...userWithoutPassword } = user
    return { success: true, message: 'Giriş başarılı.', user: userWithoutPassword }
  }

  logout(): void {
    if (this.currentUser) {
      this.logAction('logout', 'user', this.currentUser.id)
    }
    this.currentUser = null
  }

  getCurrentUser(): Omit<User, 'password'> | null {
    if (!this.currentUser) return null
    const { password: _, ...userWithoutPassword } = this.currentUser
    return userWithoutPassword
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin'
  }

  canEdit(): boolean {
    return this.isAdmin()
  }

  canDelete(): boolean {
    return this.isAdmin()
  }

  // User management (admin only)
  getAllUsers(): Omit<User, 'password'>[] {
    const users = this.db.prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY name').all() as Omit<User, 'password'>[]
    return users
  }

  getUserById(id: number): Omit<User, 'password'> | null {
    const user = this.db.prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?').get(id) as Omit<User, 'password'> | undefined
    return user || null
  }

  createUser(data: { name: string; email: string; password: string; role: 'admin' | 'staff'; status: 'active' | 'inactive' }): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    // Check if email already exists
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)
    if (existing) {
      return { success: false, message: 'Bu e-posta adresi zaten kullanılıyor.' }
    }

    try {
      const hashedPassword = bcrypt.hashSync(data.password, 10)
      const result = this.db.prepare(`
        INSERT INTO users (name, email, password, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.name, data.email, hashedPassword, data.role, data.status, now, now)

      this.logAction('create', 'user', Number(result.lastInsertRowid), null, data)

      return { success: true, message: 'Kullanıcı başarıyla oluşturuldu.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Kullanıcı oluşturulamadı.' }
    }
  }

  updateUser(id: number, data: { name: string; email: string; password?: string; role: 'admin' | 'staff'; status: 'active' | 'inactive' }): { success: boolean; message: string } {
    const now = getCurrentTimestamp()
    const oldData = this.getUserById(id)

    if (!oldData) {
      return { success: false, message: 'Kullanıcı bulunamadı.' }
    }

    // Check if email already exists (for another user)
    const existing = this.db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(data.email, id)
    if (existing) {
      return { success: false, message: 'Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.' }
    }

    try {
      if (data.password) {
        const hashedPassword = bcrypt.hashSync(data.password, 10)
        this.db.prepare(`
          UPDATE users SET name = ?, email = ?, password = ?, role = ?, status = ?, updated_at = ?
          WHERE id = ?
        `).run(data.name, data.email, hashedPassword, data.role, data.status, now, id)
      } else {
        this.db.prepare(`
          UPDATE users SET name = ?, email = ?, role = ?, status = ?, updated_at = ?
          WHERE id = ?
        `).run(data.name, data.email, data.role, data.status, now, id)
      }

      this.logAction('update', 'user', id, oldData, data)

      return { success: true, message: 'Kullanıcı başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Kullanıcı güncellenemedi.' }
    }
  }

  deleteUser(id: number): { success: boolean; message: string } {
    const user = this.getUserById(id)

    if (!user) {
      return { success: false, message: 'Kullanıcı bulunamadı.' }
    }

    // Don't allow deleting the current user
    if (this.currentUser?.id === id) {
      return { success: false, message: 'Kendi hesabınızı silemezsiniz.' }
    }

    try {
      this.db.prepare('DELETE FROM users WHERE id = ?').run(id)
      this.logAction('delete', 'user', id, user, null)

      return { success: true, message: 'Kullanıcı başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Kullanıcı silinemedi.' }
    }
  }

  private logAction(action: string, entity: string, entityId: number | null = null, oldData: object | null = null, newData: object | null = null): void {
    const now = getCurrentTimestamp()
    this.db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, old_data, new_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      this.currentUser?.id || null,
      action,
      entity,
      entityId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      now
    )
  }
}
