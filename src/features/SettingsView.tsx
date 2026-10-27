import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '../store/useStore'
import { STORAGE_KEYS, collectData, applyData } from '../utils/fileBackup'
import AuthPanel from '../components/AuthPanel'

const SettingsView: React.FC = () => {
  const { name, setName, joinDate, setJoinDate, calculateTotalVacation } = useUserStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleUpdateVacation = () => {
    const newTotal = calculateTotalVacation()
    alert(`현재 입사일 기준 예상 연차는 ${newTotal}일입니다.`)
  }

  const handleExport = () => {
    const data = collectData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-local-pulse-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string)
        const hasValidKey = STORAGE_KEYS.some(key => key in backup)
        if (!hasValidKey) throw new Error('invalid')
        applyData(backup)
        setImportStatus('success')
        setTimeout(() => window.location.reload(), 1000)
      } catch {
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="view-container"
    >
      <div style={{ marginBottom: '20px' }}><AuthPanel /></div>
      <section className="glass-card settings-card">
        <h3>사용자 설정</h3>
        <div className="settings-form">
          <div className="setting-group">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
            />
          </div>
          <div className="setting-group">
            <label>입사일</label>
            <input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
            />
          </div>
          <button className="calc-btn" onClick={handleUpdateVacation}>
            연차 자동 계산 실행
          </button>
        </div>
      </section>

      <section className="glass-card backup-card">
        <h3>데이터 백업 / 복원</h3>
        <p className="backup-desc">일정, 메모, 설정 등 모든 데이터를 JSON 파일로 저장하거나 불러올 수 있습니다.</p>
        <div className="backup-actions">
          <button className="backup-btn export-btn" onClick={handleExport}>
            💾 백업 파일 내보내기
          </button>
          <button className="backup-btn import-btn" onClick={() => fileInputRef.current?.click()}>
            📂 백업 파일 불러오기
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
        {importStatus === 'success' && (
          <div className="status-box success-box">복원 완료! 잠시 후 새로고침됩니다...</div>
        )}
        {importStatus === 'error' && (
          <div className="status-box error-box">올바른 백업 파일이 아닙니다. 다시 확인해주세요.</div>
        )}
        <div className="warning-box" style={{ marginTop: '16px' }}>
          * 캐시 삭제 전 반드시 백업 파일을 내보내두세요. 불러오기 시 기존 데이터는 덮어씌워집니다.
        </div>
      </section>

      <section className="glass-card info-card">
        <h3>시스템 정보</h3>
        <p>버전: 1.0.0 (Local-Only)</p>
        <p>저장 방식: Browser LocalStorage</p>
      </section>

      <style>{`
        .settings-card {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .setting-group label {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-sub);
        }
        .setting-group input {
          padding: 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: var(--bg-white);
          color: var(--text-main);
          font-size: 1rem;
        }
        .calc-btn {
          background: var(--primary);
          color: white;
          padding: 12px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          margin-top: 8px;
        }
        .info-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: var(--text-sub);
          font-size: 0.9rem;
        }
        .warning-box {
          margin-top: 8px;
          padding: 12px;
          background: rgba(255, 149, 0, 0.1);
          color: var(--warning);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          line-height: 1.4;
        }
        .backup-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .backup-desc {
          font-size: 0.9rem;
          color: var(--text-sub);
        }
        .backup-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .backup-btn {
          flex: 1;
          min-width: 160px;
          padding: 14px 20px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .export-btn {
          background: var(--primary);
          color: white;
        }
        .export-btn:hover {
          opacity: 0.85;
        }
        .import-btn {
          background: rgba(0, 122, 255, 0.1);
          color: var(--primary);
          border: 1px solid var(--primary);
        }
        .import-btn:hover {
          background: rgba(0, 122, 255, 0.2);
        }
        .status-box {
          padding: 12px;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-weight: 600;
        }
        .success-box {
          background: rgba(52, 199, 89, 0.15);
          color: #34C759;
        }
        .error-box {
          background: rgba(255, 59, 48, 0.1);
          color: var(--danger);
        }
      `}</style>
    </motion.div>
  )
}

export default SettingsView
