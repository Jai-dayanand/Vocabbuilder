'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      router.push('/')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
        <h2 className="text-xl font-bold mb-4 text-center">{isRegister ? 'Register' : 'Login'}</h2>
        <input type="email" placeholder="Email" className="border p-2 w-full mb-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="border p-2 w-full mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="bg-blue-600 text-white w-full py-2 rounded" type="submit">
          {isRegister ? 'Register' : 'Login'}
        </button>
        <p className="text-center mt-4 text-sm">
          {isRegister ? 'Already have an account?' : 'Don’t have an account?'}{' '}
          <span className="text-blue-500 cursor-pointer" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Login' : 'Register'}
          </span>
        </p>
      </form>
    </main>
  )
}
