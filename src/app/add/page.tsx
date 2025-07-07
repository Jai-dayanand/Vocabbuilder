'use client'
import { useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export default function AddPage() {
  const [word, setWord] = useState('')
  const [definition, setDefinition] = useState('')
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await addDoc(collection(db, 'gre_words'), { word, definition })
    router.push('/')
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Add Word</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="w-full border p-2" placeholder="Word" value={word} onChange={(e) => setWord(e.target.value)} />
        <input className="w-full border p-2" placeholder="Definition" value={definition} onChange={(e) => setDefinition(e.target.value)} />
        <button type="submit" className="bg-blue-600 text-white w-full py-2 rounded">Add</button>
      </form>
    </main>
  )
}
