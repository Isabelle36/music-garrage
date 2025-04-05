"use client"

import Image from 'next/image'
import { useState } from 'react'

const Piano = () => {
  const [activeKey, setActiveKey] = useState(null)
  
  const notes = [
    { note: 'C', key: 'a' },
    { note: 'D', key: 's' },
    { note: 'E', key: 'd' },
    { note: 'F', key: 'f' },
    { note: 'G', key: 'g' },
    { note: 'A', key: 'h' },
    { note: 'B', key: 'j' }
  ]

  const handleKeyPress = (event) => {
    const note = notes.find(n => n.key === event.key.toLowerCase())
    if (note) {
      setActiveKey(note.note)
      // TODO: Play sound
      setTimeout(() => setActiveKey(null), 200)
    }
  }

  return (
    <div 
      className="relative w-full max-w-2xl mx-auto"
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      <Image
        src="/piano-octave.png"
        alt="Piano Octave"
        width={800}
        height={200}
        className="w-full h-auto"
      />
      <div className="absolute bottom-0 left-0 w-full text-center text-sm text-gray-500">
        Press keys A-S-D-F-G-H-J to play notes C through B
      </div>
      {activeKey && (
        <div className="absolute top-0 left-0 w-full text-center text-2xl font-bold">
          {activeKey}
        </div>
      )}
    </div>
  )
}

export default Piano