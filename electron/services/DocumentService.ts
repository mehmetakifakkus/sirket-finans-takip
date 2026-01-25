import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { DatabaseWrapper } from '../database/connection'

export interface TransactionDocument {
  id: number
  transaction_id: number
  filename: string
  original_name: string
  mime_type: string
  file_size: number
  uploaded_at: string
}

export interface AddDocumentParams {
  transaction_id: number
  source_path: string
  original_name: string
  mime_type: string
}

export class DocumentService {
  private db: DatabaseWrapper
  private documentsPath: string

  constructor(db: DatabaseWrapper) {
    this.db = db
    this.documentsPath = path.join(app.getPath('userData'), 'documents')
    this.ensureDirectoryExists()
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.documentsPath)) {
      fs.mkdirSync(this.documentsPath, { recursive: true })
    }
  }

  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName)
    const hash = crypto.randomBytes(8).toString('hex')
    const timestamp = Date.now()
    return `${timestamp}_${hash}${ext}`
  }

  addDocument(params: AddDocumentParams): { success: boolean; message: string; document?: TransactionDocument } {
    try {
      const { transaction_id, source_path, original_name, mime_type } = params

      // Generate unique filename
      const filename = this.generateFilename(original_name)
      const destPath = path.join(this.documentsPath, filename)

      // Copy file
      fs.copyFileSync(source_path, destPath)

      // Get file size
      const stats = fs.statSync(destPath)
      const file_size = stats.size

      // Insert into database
      const now = new Date().toISOString()
      const stmt = this.db.prepare(`
        INSERT INTO transaction_documents (transaction_id, filename, original_name, mime_type, file_size, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      const result = stmt.run(transaction_id, filename, original_name, mime_type, file_size, now)

      const document: TransactionDocument = {
        id: result.lastInsertRowid as number,
        transaction_id,
        filename,
        original_name,
        mime_type,
        file_size,
        uploaded_at: now
      }

      return { success: true, message: 'Belge eklendi', document }
    } catch (error) {
      console.error('Add document error:', error)
      return { success: false, message: 'Belge eklenirken hata oluştu' }
    }
  }

  getDocuments(transactionId: number): TransactionDocument[] {
    const stmt = this.db.prepare(`
      SELECT * FROM transaction_documents WHERE transaction_id = ? ORDER BY uploaded_at DESC
    `)
    return stmt.all(transactionId) as TransactionDocument[]
  }

  getDocument(documentId: number): TransactionDocument | null {
    const stmt = this.db.prepare(`SELECT * FROM transaction_documents WHERE id = ?`)
    return (stmt.get(documentId) as TransactionDocument) || null
  }

  deleteDocument(documentId: number): { success: boolean; message: string } {
    try {
      // Get document info first
      const doc = this.getDocument(documentId)
      if (!doc) {
        return { success: false, message: 'Belge bulunamadı' }
      }

      // Delete file from disk
      const filePath = path.join(this.documentsPath, doc.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }

      // Delete from database
      const stmt = this.db.prepare(`DELETE FROM transaction_documents WHERE id = ?`)
      stmt.run(documentId)

      return { success: true, message: 'Belge silindi' }
    } catch (error) {
      console.error('Delete document error:', error)
      return { success: false, message: 'Belge silinirken hata oluştu' }
    }
  }

  getDocumentPath(filename: string): string {
    return path.join(this.documentsPath, filename)
  }

  getDocumentsDirectory(): string {
    return this.documentsPath
  }

  // Get document count for a transaction (for display in list)
  getDocumentCount(transactionId: number): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM transaction_documents WHERE transaction_id = ?`)
    const result = stmt.get(transactionId) as { count: number }
    return result.count
  }

  // Get document data as base64 for preview
  getDocumentPreview(documentId: number, maxWidth = 200): { success: boolean; data?: string; mimeType?: string; message?: string } {
    try {
      const doc = this.getDocument(documentId)
      if (!doc) {
        return { success: false, message: 'Belge bulunamadı' }
      }

      const filePath = path.join(this.documentsPath, doc.filename)
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Dosya bulunamadı' }
      }

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath)
      const base64Data = fileBuffer.toString('base64')

      return {
        success: true,
        data: base64Data,
        mimeType: doc.mime_type
      }
    } catch (error) {
      console.error('Get document preview error:', error)
      return { success: false, message: 'Önizleme alınamadı' }
    }
  }

  // Clean up orphaned documents (files without database records)
  cleanupOrphanedDocuments(): { deleted: number; errors: number } {
    let deleted = 0
    let errors = 0

    try {
      const files = fs.readdirSync(this.documentsPath)

      for (const file of files) {
        const stmt = this.db.prepare(`SELECT id FROM transaction_documents WHERE filename = ?`)
        const doc = stmt.get(file)

        if (!doc) {
          try {
            fs.unlinkSync(path.join(this.documentsPath, file))
            deleted++
          } catch {
            errors++
          }
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error)
    }

    return { deleted, errors }
  }
}
