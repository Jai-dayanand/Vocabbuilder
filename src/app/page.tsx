'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { signOut } from 'firebase/auth'

export default function HomePage() {
  const [words, setWords] = useState([])
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gre_words'), (snapshot) => {
      setWords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return unsub
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'gre_words', id))
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between mb-4">
        <input
          className="border p-2 w-full"
          placeholder="Search word..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={() => router.push('/add')} className="ml-2 px-4 bg-green-600 text-white rounded">+ Add</button>
        <button onClick={handleLogout} className="ml-2 px-4 bg-red-500 text-white rounded">Logout</button>
      </div>
      <div className="space-y-2">
        {words
          .filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
          .map(({ id, word, definition }) => (
            <div key={id} className="p-3 border rounded bg-gray-50 flex justify-between">
              <div>
                <h3 className="font-semibold">{word}</h3>
                <p>{definition}</p>
              </div>
              <button onClick={() => handleDelete(id)} className="text-red-500 text-sm">Delete</button>
            </div>
        ))}
      </div>
    </main>
  )
}
