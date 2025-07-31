import React, { useState, useEffect } from 'react'

interface CopyNotificationProps {
  show: boolean
  onHide: () => void
  message?: string
}

export const CopyNotification: React.FC<CopyNotificationProps> = ({ 
  show, 
  onHide, 
  message = 'Copied to clipboard!' 
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [show, onHide])

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

export default CopyNotification