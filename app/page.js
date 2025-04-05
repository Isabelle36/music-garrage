import React from 'react'
import Piano from '@/components/ui/piano'
import Metronome from '@/components/ui/metronome'

const page = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className='text-3xl text-amber-300 mb-8'>Welcome to MusicBass!</h1>
      <div className="mb-8">
        <Metronome />
      </div>
      <Piano />
    </div>
  )
}

export default page