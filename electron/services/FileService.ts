import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

export class FileService {
  private documentsPath: string

  constructor() {
    this.documentsPath = path.join(app.getPath('userData'), 'documents')
    this.ensureDirectoryExists()
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.documentsPath)) {
      fs.mkdirSync(this.documentsPath, { recursive: true })
    }
  }

  uploadDocument(sourcePath: string): string | null {
    try {
      const ext = path.extname(sourcePath)
      const hash = crypto.randomBytes(8).toString('hex')
      const timestamp = Date.now()
      const filename = `${timestamp}_${hash}${ext}`
      const destPath = path.join(this.documentsPath, filename)

      fs.copyFileSync(sourcePath, destPath)

      return filename
    } catch {
      return null
    }
  }

  deleteDocument(filename: string): boolean {
    try {
      const filePath = path.join(this.documentsPath, filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  getFullPath(filename: string): string {
    return path.join(this.documentsPath, filename)
  }

  fileExists(filename: string): boolean {
    const filePath = path.join(this.documentsPath, filename)
    return fs.existsSync(filePath)
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      // Add BOM for UTF-8 CSV files
      const bom = '\uFEFF'
      fs.writeFileSync(filePath, bom + content, 'utf-8')
      return true
    } catch {
      return false
    }
  }

  readFile(filePath: string): string | null {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  }

  getDocumentsDirectory(): string {
    return this.documentsPath
  }
}
