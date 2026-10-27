import React from 'react'
import { motion } from 'framer-motion'

const LoadingClock: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#5C94FC',
        backgroundImage: 'url(./retro/loading-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999,
        fontFamily: 'var(--font-pixel)'
      }}
    >
      {/* 상단 HUD (SCORE / COINS / STAGE / TIME) */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          left: '16px',
          right: '16px',
          maxWidth: '520px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          color: '#FFFFFF',
          textShadow: '2px 2px 0px #181818',
          fontSize: '0.85rem',
          fontWeight: 800,
          letterSpacing: '0.04em'
        }}
      >
        <div>PULSE<br />099900</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <img src="./retro/star-block.png" alt="coin" className="retro-sprite" style={{ width: '24px', height: '24px' }} />
          <span>×99</span>
        </div>
        <div>STAGE<br />1</div>
        <div>TIME<br />365</div>
      </div>

      {/* 레트로 간판 스타일 보드 */}
      <motion.div
        initial={{ scale: 0.85, y: -20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          background: '#C84C0C',
          border: '4px solid #181818',
          boxShadow: 'inset 4px 4px 0px #FCA044, inset -4px -4px 0px #7C2800, 6px 6px 0px #181818',
          padding: '20px 24px',
          borderRadius: '4px',
          textAlign: 'center',
          maxWidth: '340px',
          width: '100%',
          position: 'relative'
        }}
      >
        <div style={{
          fontSize: '0.78rem',
          color: '#FBD000',
          textShadow: '2px 2px 0px #181818',
          marginBottom: '6px',
          fontWeight: 700
        }}>
          ★ SUPER WORK &amp; CRAFT ★
        </div>
        <div style={{
          fontSize: '1.65rem',
          fontWeight: 900,
          color: '#FFCCCC',
          textShadow: '3px 3px 0px #181818',
          lineHeight: 1.2,
          letterSpacing: '1px'
        }}>
          MY LOCAL<br />PULSE.
        </div>
      </motion.div>

      {/* 캐릭터들이 달리는 중앙 스테이지 박스 */}
      <div
        style={{
          marginTop: '22px',
          background: 'rgba(24, 24, 24, 0.78)',
          border: '3px solid #181818',
          boxShadow: '4px 4px 0px #181818',
          borderRadius: '6px',
          padding: '14px 18px',
          maxWidth: '340px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '16px' }}>
          <motion.img
            src="./retro/runner.png"
            alt="Runner"
            className="retro-sprite"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '48px', height: '48px' }}
          />
          <img
            src="./retro/star-block.png"
            alt="Star Block"
            className="retro-sprite"
            style={{ width: '44px', height: '44px', marginBottom: '8px' }}
          />
          <motion.img
            src="./retro/robot.png"
            alt="Robot"
            className="retro-sprite"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            style={{ width: '48px', height: '48px' }}
          />
          <img
            src="./retro/slime.png"
            alt="Slime"
            className="retro-sprite"
            style={{ width: '36px', height: '36px' }}
          />
        </div>

        {/* 레트로 픽셀 게이지 바 */}
        <div style={{
          width: '100%',
          height: '16px',
          background: '#181818',
          border: '2px solid #FFFDF7',
          padding: '2px',
          borderRadius: '2px'
        }}>
          <motion.div
            initial={{ width: '5%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.75, ease: 'linear' }}
            style={{
              height: '100%',
              background: 'repeating-linear-gradient(90deg, #00A800 0px, #00A800 10px, #58D854 10px, #58D854 14px)'
            }}
          />
        </div>

        <motion.p
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#FBD000',
            textShadow: '1px 1px 0px #000000',
            letterSpacing: '0.05em'
          }}
        >
          ▶ STAGE 1-1 LOADING...
        </motion.p>
      </div>
    </motion.div>
  )
}

export default LoadingClock
