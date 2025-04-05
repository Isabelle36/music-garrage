"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from './button'

const Metronome = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempo, setTempo] = useState(120)
  const [currentBeat, setCurrentBeat] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (isPlaying) {
      const interval = 60000 / tempo // Convert BPM to milliseconds
      intervalRef.current = setInterval(() => {
        setCurrentBeat((prev) => (prev + 1) % 4)
      }, interval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      setCurrentBeat(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, tempo])

  const togglePlaying = () => {
    setIsPlaying(!isPlaying)
  }

  const handleTempoChange = (value) => {
    setTempo(value)
  }

  return (
    <div className="p-6 bg-zinc-800 rounded-lg shadow-lg max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Metronome</h2>
        <div className="text-amber-300">{tempo} BPM</div>
      </div>
      
      <div className="flex justify-center mb-6">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((beat) => (
            <div
              key={beat}
              className={`w-4 h-4 rounded-full ${
                currentBeat === beat
                  ? 'bg-amber-300'
                  : 'bg-zinc-600'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <input
          type="range"
          min="40"
          max="208"
          value={tempo}
          onChange={(e) => handleTempoChange(Number(e.target.value))}
          className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <Button 
        onClick={togglePlaying}
        className="w-full"
        variant={isPlaying ? "destructive" : "default"}
      >
        {isPlaying ? 'Stop' : 'Start'}
      </Button>
    </div>
  )
}

export default Metronome