import React from 'react'
import { motion } from 'framer-motion'

const LoadingClock: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-light)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        border: '4px solid var(--primary)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Hour Hand */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            width: '4px',
            height: '30px',
            backgroundColor: 'var(--primary)',
            borderRadius: '2px',
            bottom: '50%',
            transformOrigin: 'bottom center'
          }}
        />
        {/* Minute Hand */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            width: '2px',
            height: '45px',
            backgroundColor: 'var(--text-main)',
            borderRadius: '1px',
            bottom: '50%',
            transformOrigin: 'bottom center'
          }}
        />
        {/* Center Point */}
        <div style={{
          width: '8px',
          height: '8px',
          backgroundColor: 'var(--primary)',
          borderRadius: '50%',
          zIndex: 1
        }} />
      </div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          marginTop: '24px',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--primary)',
          letterSpacing: '1px'
        }}
      >
        MY LOCAL PULSE
      </motion.p>
    </motion.div>
  )
}

export default LoadingClock
